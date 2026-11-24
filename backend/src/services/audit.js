const AuditLog = require("../models/AuditLog");

// Audit failures must never break the request that triggered them.
module.exports = async function audit(actor, action, details = {}, txHash) {
  try {
    await AuditLog.create({ actor: actor?._id, actorEmail: actor?.email, action, details, txHash });
  } catch (err) {
    console.error("Audit log write failed:", err.message);
  }
};
