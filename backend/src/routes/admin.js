const router = require("express").Router();
const User = require("../models/User");
const CandidateApplication = require("../models/CandidateApplication");
const AuditLog = require("../models/AuditLog");
const v = require("../middleware/validate");
const { asyncHandler, HttpError } = require("../middleware/error");
const { protect, requireRole } = require("../middleware/auth");
const chain = require("../services/blockchain");
const audit = require("../services/audit");

router.use(protect, requireRole("admin"));

const record = (user, electionId, txHash) => {
  if (!user.authorizedElections.some((a) => a.electionId === electionId)) {
    user.authorizedElections.push({ electionId, txHash });
  }
  return user.save();
};

async function assertElectionOpenForSetup(electionId) {
  const election = await chain.getElection(electionId);
  if (!election) throw new HttpError(404, "That election does not exist on the blockchain.");
  if (election.state === "Ended") throw new HttpError(400, "That election has ended.");
  return election;
}

// ---------------------------------------------------------------- overview
router.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const [voters, candidates, pendingUsers, pendingApplications] = await Promise.all([
      User.countDocuments({ role: "voter" }),
      User.countDocuments({ role: "candidate" }),
      User.countDocuments({ role: { $ne: "admin" }, verificationStatus: "pending" }),
      CandidateApplication.countDocuments({ status: "pending" }),
    ]);
    res.json({ voters, candidates, pendingUsers, pendingApplications });
  })
);

// ------------------------------------------------------------------- users
router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const filter = {};
    if (["admin", "voter", "candidate"].includes(req.query.role)) filter.role = req.query.role;
    if (["pending", "verified", "rejected"].includes(req.query.status)) filter.verificationStatus = req.query.status;
    res.json({ users: await User.find(filter).sort({ createdAt: -1 }).limit(500) });
  })
);

router.patch(
  "/users/:id/verification",
  asyncHandler(async (req, res) => {
    const status = req.body.status;
    if (!["pending", "verified", "rejected"].includes(status)) throw new HttpError(400, "Status must be pending, verified or rejected.");
    const user = await User.findById(req.params.id);
    if (!user) throw new HttpError(404, "User not found.");
    if (user.role === "admin") throw new HttpError(400, "Admin accounts are not verified this way.");
    user.verificationStatus = status;
    await user.save();
    await audit(req.user, "USER_VERIFICATION_CHANGED", { userId: user._id, email: user.email, status });
    res.json({ user });
  })
);

// Authorize one verified voter's wallet for one election (on-chain transaction).
router.post(
  "/users/:id/authorize",
  asyncHandler(async (req, res) => {
    const electionId = v.electionId(req.body.electionId);
    const user = await User.findById(req.params.id);
    if (!user || user.role === "admin") throw new HttpError(404, "Voter not found.");
    if (user.verificationStatus !== "verified") throw new HttpError(400, "Verify this voter's identity first.");
    if (!user.walletAddress) throw new HttpError(400, "This voter has not linked a wallet address yet.");
    await assertElectionOpenForSetup(electionId);

    if (await chain.isAuthorized(electionId, user.walletAddress)) {
      await record(user, electionId, undefined);
      return res.json({ message: "Wallet was already authorized on the blockchain.", txHash: null, user });
    }
    const { txHash } = await chain.authorizeVoter(electionId, user.walletAddress);
    await record(user, electionId, txHash);
    await audit(req.user, "VOTER_AUTHORIZED", { electionId, userId: user._id, wallet: user.walletAddress }, txHash);
    res.json({ message: "Wallet authorized on the blockchain.", txHash, user });
  })
);

// Authorize every verified voter that has a wallet (skips wallets already authorized on chain).
router.post(
  "/elections/:electionId/authorize-verified",
  asyncHandler(async (req, res) => {
    const electionId = v.electionId(req.params.electionId);
    await assertElectionOpenForSetup(electionId);
    const users = await User.find({
      role: { $in: ["voter", "candidate"] },
      verificationStatus: "verified",
      walletAddress: { $exists: true },
      "authorizedElections.electionId": { $ne: electionId },
    });

    const toSend = [];
    let alreadyOnChain = 0;
    for (const u of users) {
      if (await chain.isAuthorized(electionId, u.walletAddress)) {
        await record(u, electionId, undefined);
        alreadyOnChain++;
      } else {
        toSend.push(u);
      }
    }
    const txHashes = [];
    for (let i = 0; i < toSend.length; i += 100) {
      const batch = toSend.slice(i, i + 100); // contract allows 1 to 100 per call
      const { txHash } = await chain.authorizeVoters(electionId, batch.map((u) => u.walletAddress));
      for (const u of batch) await record(u, electionId, txHash);
      txHashes.push(txHash);
      await audit(req.user, "VOTERS_AUTHORIZED_BATCH", { electionId, count: batch.length }, txHash);
    }
    res.json({ authorizedNow: toSend.length, alreadyAuthorized: alreadyOnChain, txHashes });
  })
);

// ------------------------------------------------------------ applications
router.get(
  "/applications",
  asyncHandler(async (req, res) => {
    const filter = ["pending", "approved", "rejected"].includes(req.query.status) ? { status: req.query.status } : {};
    const applications = await CandidateApplication.find(filter).populate("user", "name email studentId verificationStatus").sort({ createdAt: -1 });
    res.json({ applications });
  })
);

const busy = new Set(); // stops a double click from registering the same candidate twice

router.post(
  "/applications/:id/approve",
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    if (busy.has(id)) throw new HttpError(409, "This application is already being processed.");
    busy.add(id);
    try {
      const app = await CandidateApplication.findById(id).populate("user");
      if (!app) throw new HttpError(404, "Application not found.");
      if (app.status === "approved") throw new HttpError(409, "Already approved.");
      if (app.user.verificationStatus !== "verified") throw new HttpError(400, "Verify the applicant's identity first.");
      const election = await chain.getElection(app.electionId);
      if (!election) throw new HttpError(404, "That election does not exist on the blockchain.");
      if (election.state !== "Upcoming" || election.closed) {
        throw new HttpError(400, "Candidates can only be approved before the election starts.");
      }

      // Step 1: register on chain. Saved immediately, so a failed step 2 can be retried without a duplicate.
      if (!app.onChainCandidateId) {
        const { txHash, receipt } = await chain.addCandidate(app.electionId, app.user.name, `application:${app._id}`);
        app.onChainCandidateId = chain.candidateIdFromReceipt(receipt);
        app.registerTxHash = txHash;
        await app.save();
      }
      // Step 2: approve on chain.
      const { txHash } = await chain.approveCandidate(app.electionId, app.onChainCandidateId);
      app.approveTxHash = txHash;
      app.status = "approved";
      app.reviewNote = v.str(req.body.note) || undefined;
      await app.save();
      await audit(req.user, "CANDIDATE_APPROVED", { applicationId: app._id, electionId: app.electionId, candidateId: app.onChainCandidateId }, txHash);
      res.json({ application: app });
    } finally {
      busy.delete(id);
    }
  })
);

router.post(
  "/applications/:id/reject",
  asyncHandler(async (req, res) => {
    const app = await CandidateApplication.findById(req.params.id);
    if (!app) throw new HttpError(404, "Application not found.");
    if (app.status === "rejected") throw new HttpError(409, "Already rejected.");
    let txHash;
    if (app.onChainCandidateId) {
      // Candidate was already registered on chain, so mark it rejected there too.
      ({ txHash } = await chain.rejectCandidate(app.electionId, app.onChainCandidateId));
      app.approveTxHash = txHash;
    }
    app.status = "rejected";
    app.reviewNote = v.str(req.body.note) || undefined;
    await app.save();
    await audit(req.user, "CANDIDATE_REJECTED", { applicationId: app._id, electionId: app.electionId }, txHash);
    res.json({ application: app });
  })
);

// --------------------------------------------------------------- audit log
router.get(
  "/audit-logs",
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    res.json({ logs: await AuditLog.find().sort({ createdAt: -1 }).limit(limit) });
  })
);

module.exports = router;
