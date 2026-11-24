const router = require("express").Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const v = require("../middleware/validate");
const { asyncHandler, HttpError } = require("../middleware/error");
const { signToken, protect } = require("../middleware/auth");
const audit = require("../services/audit");

// Public registration only creates voters or candidates. Admins come from the seed script.
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const role = req.body.role === "candidate" ? "candidate" : "voter";
    const user = await User.create({
      name: v.name(req.body.name),
      email: v.email(req.body.email),
      passwordHash: await bcrypt.hash(v.password(req.body.password), 12),
      role,
      studentId: v.str(req.body.studentId) || undefined,
      walletAddress: v.wallet(req.body.walletAddress),
    });
    await audit(user, "USER_REGISTERED", { role });
    res.status(201).json({ token: signToken(user), user });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const email = v.email(req.body.email);
    const user = await User.findOne({ email }).select("+passwordHash");
    // Same message for unknown email and wrong password, so accounts cannot be probed.
    const ok = user && (await bcrypt.compare(String(req.body.password || ""), user.passwordHash));
    if (!ok) throw new HttpError(401, "Incorrect email or password.");
    await audit(user, "USER_LOGIN");
    res.json({ token: signToken(user), user });
  })
);

router.get("/me", protect, (req, res) => res.json({ user: req.user }));

// Users may update their name and link a wallet. Role and verification status are never editable here.
router.patch(
  "/me",
  protect,
  asyncHandler(async (req, res) => {
    if (req.body.name !== undefined) req.user.name = v.name(req.body.name);
    if (req.body.walletAddress !== undefined) {
      const w = v.wallet(req.body.walletAddress);
      if (req.user.authorizedElections.length && w !== req.user.walletAddress) {
        throw new HttpError(409, "Wallet cannot be changed after it was authorized for an election. Contact the admin.");
      }
      req.user.walletAddress = w; // undefined clears it
    }
    await req.user.save();
    res.json({ user: req.user });
  })
);

router.post(
  "/change-password",
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select("+passwordHash");
    if (!(await bcrypt.compare(String(req.body.currentPassword || ""), user.passwordHash))) {
      throw new HttpError(401, "Current password is incorrect.");
    }
    user.passwordHash = await bcrypt.hash(v.password(req.body.newPassword), 12);
    await user.save();
    await audit(user, "PASSWORD_CHANGED");
    res.json({ message: "Password updated." });
  })
);

module.exports = router;
