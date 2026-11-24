const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const config = require("./config");
const { notFound, errorHandler } = require("./middleware/error");

const app = express();
app.use(helmet());
app.use(cors({ origin: config.corsOrigin.split(",").map((s) => s.trim()) }));
app.use(express.json({ limit: "20kb" }));

// Brute-force protection on login and registration only.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false, message: { error: "Too many attempts. Try again in a few minutes." } });
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "E-Voting System API" }));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/candidate", require("./routes/candidate"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/chain", require("./routes/chain"));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
