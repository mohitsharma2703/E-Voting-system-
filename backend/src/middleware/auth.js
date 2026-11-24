const jwt = require("jsonwebtoken");
const config = require("../config");
const User = require("../models/User");
const { HttpError, asyncHandler } = require("./error");

const signToken = (user) =>
  jwt.sign({ sub: user._id.toString(), role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

// Loads the user from the database on every request, so role changes apply immediately.
const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) throw new HttpError(401, "Login required.");
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new HttpError(401, "Session expired or invalid. Please log in again.");
  }
  const user = await User.findById(payload.sub);
  if (!user) throw new HttpError(401, "Account no longer exists.");
  req.user = user;
  next();
});

const requireRole = (...roles) => (req, _res, next) =>
  roles.includes(req.user.role) ? next() : next(new HttpError(403, "You do not have permission to do that."));

module.exports = { signToken, protect, requireRole };
