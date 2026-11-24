const mongoose = require("mongoose");

module.exports = mongoose.model(
  "AuditLog",
  new mongoose.Schema(
    {
      actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      actorEmail: String,
      action: { type: String, required: true },
      details: mongoose.Schema.Types.Mixed,
      txHash: String,
    },
    { timestamps: { createdAt: true, updatedAt: false } }
  )
);
