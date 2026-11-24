const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

// Enum mirrors (see Voting.sol)
const Status = { Pending: 0n, Approved: 1n, Rejected: 2n };
const State = { Upcoming: 0n, Active: 1n, Ended: 2n };

describe("Voting contract", function () {
  // Fresh deployment + one election (starts in 1 hour, lasts 2 hours) for every test
  async function deployFixture() {
    const [owner, alice, bob, carol, outsider] = await ethers.getSigners();
    const voting = await ethers.deployContract("Voting", [owner.address]);

    const now = await time.latest();
    const start = now + 3600;
    const end = start + 7200;
    await voting.createElection("Student Council 2026", "Annual election", start, end);

    return { voting, owner, alice, bob, carol, outsider, start, end };
  }

  // Election with 2 approved candidates, alice & bob authorized, and voting window OPEN
  async function activeFixture() {
    const base = await deployFixture();
    const { voting, alice, bob, start } = base;
    await voting.addCandidate(1, "Candidate One", "db:cand1");
    await voting.addCandidate(1, "Candidate Two", "db:cand2");
    await voting.approveCandidate(1, 1);
    await voting.approveCandidate(1, 2);
    await voting.authorizeVoter(1, alice.address);
    await voting.authorizeVoter(1, bob.address);
    await time.increaseTo(start + 1);
    return base;
  }

  describe("Admin election creation", function () {
    it("sets the deployer-supplied owner", async function () {
      const { voting, owner } = await loadFixture(deployFixture);
      expect(await voting.owner()).to.equal(owner.address);
    });

    it("creates an election and emits ElectionCreated", async function () {
      const { voting, start, end } = await loadFixture(deployFixture);
      expect(await voting.electionCount()).to.equal(1n);
      const e = await voting.getElection(1);
      expect(e.title).to.equal("Student Council 2026");
      expect(e.startTime).to.equal(BigInt(start));
      expect(e.endTime).to.equal(BigInt(end));
      expect(e.state).to.equal(State.Upcoming);
    });

    it("emits ElectionCreated with correct arguments", async function () {
      const { voting } = await loadFixture(deployFixture);
      const now = await time.latest();
      await expect(voting.createElection("Second", "d", now + 100, now + 200))
        .to.emit(voting, "ElectionCreated")
        .withArgs(2, "Second", now + 100, now + 200);
    });

    it("rejects an empty title, bad time range, and past end time", async function () {
      const { voting } = await loadFixture(deployFixture);
      const now = await time.latest();
      await expect(voting.createElection("", "d", now + 10, now + 20)).to.be.revertedWith("Title is required");
      await expect(voting.createElection("X", "d", now + 20, now + 10)).to.be.revertedWith("End must be after start");
      await expect(voting.createElection("X", "d", now - 200, now - 100)).to.be.revertedWith("End time is in the past");
    });

    it("lets the owner edit an election before it starts, but not after", async function () {
      const { voting, start, end } = await loadFixture(deployFixture);
      await expect(voting.updateElection(1, "Renamed", "d", start, end)).to.emit(voting, "ElectionUpdated");
      expect((await voting.getElection(1)).title).to.equal("Renamed");
      await time.increaseTo(start + 1);
      await expect(voting.updateElection(1, "Late", "d", start, end)).to.be.revertedWith("Election already started");
    });

    it("lets the owner close an election early", async function () {
      const { voting } = await loadFixture(activeFixture);
      await expect(voting.closeElection(1)).to.emit(voting, "ElectionClosed").withArgs(1);
      expect(await voting.getElectionState(1)).to.equal(State.Ended);
      await expect(voting.closeElection(1)).to.be.revertedWith("Election already closed");
    });

    it("reverts for a non-existent election", async function () {
      const { voting } = await loadFixture(deployFixture);
      await expect(voting.getElection(99)).to.be.revertedWith("Election does not exist");
    });
  });

  describe("Candidate registration and approval", function () {
    it("registers a candidate as Pending and emits an event", async function () {
      const { voting } = await loadFixture(deployFixture);
      await expect(voting.addCandidate(1, "Candidate One", "db:cand1"))
        .to.emit(voting, "CandidateRegistered")
        .withArgs(1, 1, "Candidate One");
      const c = await voting.getCandidate(1, 1);
      expect(c.name).to.equal("Candidate One");
      expect(c.status).to.equal(Status.Pending);
    });

    it("approves and rejects candidates", async function () {
      const { voting } = await loadFixture(deployFixture);
      await voting.addCandidate(1, "A", "");
      await voting.addCandidate(1, "B", "");
      await expect(voting.approveCandidate(1, 1)).to.emit(voting, "CandidateStatusChanged").withArgs(1, 1, Status.Approved);
      await voting.rejectCandidate(1, 2);
      expect((await voting.getCandidate(1, 1)).status).to.equal(Status.Approved);
      expect((await voting.getCandidate(1, 2)).status).to.equal(Status.Rejected);
    });

    it("rejects empty names and invalid candidate ids", async function () {
      const { voting } = await loadFixture(deployFixture);
      await expect(voting.addCandidate(1, "", "")).to.be.revertedWith("Candidate name is required");
      await expect(voting.approveCandidate(1, 5)).to.be.revertedWith("Invalid candidate");
    });

    it("does not allow changing candidates after voting has started", async function () {
      const { voting } = await loadFixture(activeFixture);
      await expect(voting.addCandidate(1, "Late", "")).to.be.revertedWith("Election already started");
      await expect(voting.rejectCandidate(1, 1)).to.be.revertedWith("Election already started");
    });
  });

  describe("Voter authorization", function () {
    it("authorizes a voter and emits VoterRegistered", async function () {
      const { voting, alice } = await loadFixture(deployFixture);
      await expect(voting.authorizeVoter(1, alice.address)).to.emit(voting, "VoterRegistered").withArgs(1, alice.address);
      expect(await voting.isAuthorized(1, alice.address)).to.equal(true);
    });

    it("authorizes many voters in one call", async function () {
      const { voting, alice, bob } = await loadFixture(deployFixture);
      await voting.authorizeVoters(1, [alice.address, bob.address]);
      expect(await voting.isAuthorized(1, alice.address)).to.equal(true);
      expect(await voting.isAuthorized(1, bob.address)).to.equal(true);
    });

    it("rejects duplicates and the zero address", async function () {
      const { voting, alice } = await loadFixture(deployFixture);
      await voting.authorizeVoter(1, alice.address);
      await expect(voting.authorizeVoter(1, alice.address)).to.be.revertedWith("Voter already authorized");
      await expect(voting.authorizeVoter(1, ethers.ZeroAddress)).to.be.revertedWith("Invalid voter address");
    });

    it("revokes an authorization only if the voter has not voted", async function () {
      const { voting, alice, bob } = await loadFixture(activeFixture);
      await voting.connect(alice).castVote(1, 1);
      await expect(voting.revokeVoter(1, alice.address)).to.be.revertedWith("Voter has already voted");
      await expect(voting.revokeVoter(1, bob.address)).to.emit(voting, "VoterRevoked").withArgs(1, bob.address);
    });
  });

  describe("Successful voting", function () {
    it("records a vote, flags the voter, and emits VoteCast", async function () {
      const { voting, alice } = await loadFixture(activeFixture);
      await expect(voting.connect(alice).castVote(1, 1)).to.emit(voting, "VoteCast").withArgs(1, alice.address, 1);
      expect(await voting.hasAddressVoted(1, alice.address)).to.equal(true);
      expect((await voting.getElection(1)).totalVotes).to.equal(1n);
    });
  });

  describe("Rejected voting attempts", function () {
    it("rejects a duplicate vote from the same wallet", async function () {
      const { voting, alice } = await loadFixture(activeFixture);
      await voting.connect(alice).castVote(1, 1);
      await expect(voting.connect(alice).castVote(1, 2)).to.be.revertedWith("You have already voted");
    });

    it("rejects an unauthorized wallet", async function () {
      const { voting, outsider } = await loadFixture(activeFixture);
      await expect(voting.connect(outsider).castVote(1, 1)).to.be.revertedWith("Wallet is not authorized to vote");
    });

    it("rejects an invalid candidate id (0 and out of range)", async function () {
      const { voting, alice } = await loadFixture(activeFixture);
      await expect(voting.connect(alice).castVote(1, 0)).to.be.revertedWith("Invalid candidate");
      await expect(voting.connect(alice).castVote(1, 99)).to.be.revertedWith("Invalid candidate");
    });

    it("rejects a vote for a non-approved candidate", async function () {
      const { voting, alice, start } = await loadFixture(deployFixture);
      await voting.addCandidate(1, "Pending Guy", "");
      await voting.authorizeVoter(1, alice.address);
      await time.increaseTo(start + 1);
      await expect(voting.connect(alice).castVote(1, 1)).to.be.revertedWith("Candidate is not approved");
    });

    it("rejects voting before the election starts", async function () {
      const { voting, alice } = await loadFixture(deployFixture);
      await voting.addCandidate(1, "A", "");
      await voting.approveCandidate(1, 1);
      await voting.authorizeVoter(1, alice.address);
      await expect(voting.connect(alice).castVote(1, 1)).to.be.revertedWith("Election has not started");
    });

    it("rejects voting after the election ends", async function () {
      const { voting, alice, end } = await loadFixture(activeFixture);
      await time.increaseTo(end + 1);
      await expect(voting.connect(alice).castVote(1, 1)).to.be.revertedWith("Election has ended");
    });

    it("rejects voting after the admin closes the election", async function () {
      const { voting, alice } = await loadFixture(activeFixture);
      await voting.closeElection(1);
      await expect(voting.connect(alice).castVote(1, 1)).to.be.revertedWith("Election is closed");
    });

    it("rejects voting in a non-existent election", async function () {
      const { voting, alice } = await loadFixture(activeFixture);
      await expect(voting.connect(alice).castVote(42, 1)).to.be.revertedWith("Election does not exist");
    });
  });

  describe("Unauthorized admin operations", function () {
    it("blocks every admin function for non-owners", async function () {
      const { voting, alice, bob, start, end } = await loadFixture(deployFixture);
      const asAlice = voting.connect(alice);
      const denied = "OwnableUnauthorizedAccount";
      await expect(asAlice.createElection("X", "d", start, end)).to.be.revertedWithCustomError(voting, denied);
      await expect(asAlice.updateElection(1, "X", "d", start, end)).to.be.revertedWithCustomError(voting, denied);
      await expect(asAlice.closeElection(1)).to.be.revertedWithCustomError(voting, denied);
      await expect(asAlice.addCandidate(1, "X", "")).to.be.revertedWithCustomError(voting, denied);
      await expect(asAlice.approveCandidate(1, 1)).to.be.revertedWithCustomError(voting, denied);
      await expect(asAlice.rejectCandidate(1, 1)).to.be.revertedWithCustomError(voting, denied);
      await expect(asAlice.authorizeVoter(1, bob.address)).to.be.revertedWithCustomError(voting, denied);
      await expect(asAlice.authorizeVoters(1, [bob.address])).to.be.revertedWithCustomError(voting, denied);
      await expect(asAlice.revokeVoter(1, bob.address)).to.be.revertedWithCustomError(voting, denied);
    });
  });

  describe("Results", function () {
    it("hides results while the election is running", async function () {
      const { voting, alice } = await loadFixture(activeFixture);
      await voting.connect(alice).castVote(1, 1);
      await expect(voting.getResults(1)).to.be.revertedWith("Results not available until election ends");
      expect((await voting.getCandidate(1, 1)).voteCount).to.equal(0n); // masked until end
    });

    it("calculates correct results after the election ends", async function () {
      const { voting, alice, bob, end } = await loadFixture(activeFixture);
      await voting.connect(alice).castVote(1, 2);
      await voting.connect(bob).castVote(1, 2);
      await time.increaseTo(end + 1);

      const r = await voting.getResults(1);
      expect(r.candidateIds.map(Number)).to.deep.equal([1, 2]);
      expect(r.names).to.deep.equal(["Candidate One", "Candidate Two"]);
      expect(r.voteCounts.map(Number)).to.deep.equal([0, 2]);
      expect((await voting.getElection(1)).totalVotes).to.equal(2n);
      expect((await voting.getCandidate(1, 2)).voteCount).to.equal(2n);
    });

    it("reveals results immediately after an early close", async function () {
      const { voting, alice } = await loadFixture(activeFixture);
      await voting.connect(alice).castVote(1, 1);
      await voting.closeElection(1);
      const r = await voting.getResults(1);
      expect(r.voteCounts.map(Number)).to.deep.equal([1, 0]);
    });
  });
});
