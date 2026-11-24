const router = require("express").Router();
const CandidateApplication = require("../models/CandidateApplication");
const v = require("../middleware/validate");
const { asyncHandler, HttpError } = require("../middleware/error");
const { protect, requireRole } = require("../middleware/auth");
const chain = require("../services/blockchain");
const audit = require("../services/audit");

router.use(protect, requireRole("candidate"));

router.post(
  "/applications",
  asyncHandler(async (req, res) => {
    if (req.user.verificationStatus !== "verified") {
      throw new HttpError(403, "Your identity must be verified by the admin before you can apply.");
    }
    const electionId = v.electionId(req.body.electionId);
    const manifesto = v.str(req.body.manifesto);
    if (manifesto.length < 20 || manifesto.length > 2000) throw new HttpError(400, "Manifesto must be 20 to 2000 characters.");

    const election = await chain.getElection(electionId);
    if (!election) throw new HttpError(404, "That election does not exist on the blockchain.");
    if (election.state !== "Upcoming" || election.closed) {
      throw new HttpError(400, "Applications are only open before an election starts.");
    }
    const app = await CandidateApplication.create({ user: req.user._id, electionId, manifesto });
    await audit(req.user, "CANDIDATE_APPLIED", { electionId, applicationId: app._id });
    res.status(201).json({ application: app });
  })
);

router.get(
  "/applications/mine",
  asyncHandler(async (req, res) => {
    const applications = await CandidateApplication.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ applications });
  })
);

router.patch(
  "/applications/:id",
  asyncHandler(async (req, res) => {
    const app = await CandidateApplication.findOne({ _id: req.params.id, user: req.user._id });
    if (!app) throw new HttpError(404, "Application not found.");
    if (app.status !== "pending") throw new HttpError(409, "Only pending applications can be edited.");
    const manifesto = v.str(req.body.manifesto);
    if (manifesto.length < 20 || manifesto.length > 2000) throw new HttpError(400, "Manifesto must be 20 to 2000 characters.");
    app.manifesto = manifesto;
    await app.save();
    res.json({ application: app });
  })
);

module.exports = router;
