
// Seeds a fresh local Hardhat blockchain with demo election data.
// Run AFTER deployment: npm run seed:local

const hre = require("hardhat");

async function main() {
  const signers = await hre.ethers.getSigners();

  const owner = signers[0];
  const voters = signers.slice(1, 6);

  const deployment = require("../deployments/localhost.json");

  const voting = await hre.ethers.getContractAt(
    "Voting",
    deployment.address,
    owner
  );

  const wait = async (tx) => (await tx).wait();

  const latestBlock = await hre.ethers.provider.getBlock("latest");
  const base = latestBlock.timestamp;

  // Use large time gaps so all setup transactions finish
  // before the first election starts.
  const endedStart = base + 86400;
  const endedEnd = base + 90000;

  const activeStart = base + 172800;
  const activeEnd = base + 259200;

  const upcomingStart = base + 345600;
  const upcomingEnd = base + 432000;

  async function makeElection(title, desc, start, end, names) {
    await wait(voting.createElection(title, desc, start, end));

    const id = Number(await voting.electionCount());

    for (const name of names) {
      await wait(voting.addCandidate(id, name, "Demo candidate"));
    }

    for (let candidateId = 1; candidateId <= names.length; candidateId++) {
      await wait(voting.approveCandidate(id, candidateId));
    }

    await wait(
      voting.authorizeVoters(
        id,
        voters.map((voter) => voter.address)
      )
    );

    console.log(`Created election: ${title} (ID ${id})`);

    return id;
  }

  const endedId = await makeElection(
    "Class Representative 2025",
    "Completed demo election with results.",
    endedStart,
    endedEnd,
    ["Aarav Sharma", "Meera Iyer", "Kabir Singh"]
  );

  const activeId = await makeElection(
    "Student Council 2026",
    "President of the student council. One vote per authorized wallet.",
    activeStart,
    activeEnd,
    ["Riya Verma", "Arjun Mehta", "Sana Khan"]
  );

  const upcomingId = await makeElection(
    "Sports Committee 2026",
    "Captain and vice-captain selection.",
    upcomingStart,
    upcomingEnd,
    ["Dev Malhotra", "Ishita Rao"]
  );

  // Move into the first election's voting period.
  await hre.network.provider.send("evm_setNextBlockTimestamp", [
    endedStart + 1,
  ]);
  await hre.network.provider.send("evm_mine");

  // Cast four demo votes.
  await wait(voting.connect(voters[0]).castVote(endedId, 1));
  await wait(voting.connect(voters[1]).castVote(endedId, 1));
  await wait(voting.connect(voters[2]).castVote(endedId, 2));
  await wait(voting.connect(voters[3]).castVote(endedId, 3));

  // Move into the second election's voting period.
  await hre.network.provider.send("evm_setNextBlockTimestamp", [
    activeStart + 1,
  ]);
  await hre.network.provider.send("evm_mine");

  console.log("----------------------------------------");
  console.log("DEMO ELECTIONS CREATED SUCCESSFULLY");
  console.log("----------------------------------------");
  console.log(`Ended election ID: ${endedId} (4 votes)`);
  console.log(`Active election ID: ${activeId}`);
  console.log(`Upcoming election ID: ${upcomingId}`);
  console.log(`Contract address: ${deployment.address}`);
  console.log("----------------------------------------");
}

main().catch((error) => {
  console.error("Demo seeding failed:", error);
  process.exitCode = 1;
});
