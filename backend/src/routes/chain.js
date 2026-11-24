const router = require("express").Router();
const { asyncHandler, HttpError } = require("../middleware/error");
const { protect } = require("../middleware/auth");
const v = require("../middleware/validate");
const chain = require("../services/blockchain");
const CandidateApplication = require("../models/CandidateApplication");

// Public: is the blockchain reachable and is the server signer the contract owner?
router.get("/status", asyncHandler(async (_req, res) => res.json(await chain.getStatus())));

// Public: verify any transaction against our contract.
router.get(
  "/tx/:hash",
  asyncHandler(async (req, res) => {
    if (!/^0x[0-9a-fA-F]{64}$/.test(req.params.hash)) throw new HttpError(400, "Transaction hash must be 0x followed by 64 hex characters.");
    const tx = await chain.inspectTx(req.params.hash);
    if (!tx) throw new HttpError(404, "Transaction not found on this chain.");
    res.json(tx);
  })
);

// Public: approved candidates with off-chain manifestos, matched to on-chain candidate ids.
router.get(
  "/elections/:electionId/candidate-profiles",
  asyncHandler(async (req, res) => {
    const electionId = v.electionId(req.params.electionId);
    const apps = await CandidateApplication.find({ electionId, status: "approved" }).populate("user", "name");
    res.json({
      profiles: apps.map((a) => ({
        candidateId: a.onChainCandidateId,
        name: a.user.name,
        manifesto: a.manifesto,
        registerTxHash: a.registerTxHash,
        approveTxHash: a.approveTxHash,
      })),
    });
  })
);

// Logged-in user: can my linked wallet vote in this election?
router.get(
  "/elections/:electionId/eligibility",
  protect,
  asyncHandler(async (req, res) => {
    const electionId = v.electionId(req.params.electionId);
    const election = await chain.getElection(electionId);
    if (!election) throw new HttpError(404, "That election does not exist on the blockchain.");
    const wallet = req.user.walletAddress;
    const [authorized, voted] = wallet
      ? [await chain.isAuthorized(electionId, wallet), await chain.hasVoted(electionId, wallet)]
      : [false, false];
    let reason = null;
    if (!wallet) reason = "Link a wallet address to your profile.";
    else if (req.user.verificationStatus !== "verified") reason = "Your identity has not been verified by the admin yet.";
    else if (!authorized) reason = "The admin has not authorized your wallet for this election.";
    else if (voted) reason = "You have already voted in this election.";
    else if (election.state !== "Active") reason = `Election is ${election.state.toLowerCase()}.`;
    res.json({
      electionId,
      electionState: election.state,
      verificationStatus: req.user.verificationStatus,
      walletAddress: wallet || null,
      authorizedOnChain: authorized,
      hasVoted: voted,
      canVote: !reason,
      reason,
    });
  })
);

module.exports = router;
