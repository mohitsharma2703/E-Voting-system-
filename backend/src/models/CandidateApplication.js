const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    electionId: { type: Number, required: true, min: 1 }, // on-chain election id
    manifesto: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewNote: { type: String, trim: true, maxlength: 300 },
    onChainCandidateId: Number,
    registerTxHash: String,
    approveTxHash: String,
  },
  { timestamps: true }
);

schema.index({ user: 1, electionId: 1 }, { unique: true }); // one application per person per election

module.exports = mongoose.model("CandidateApplication", schema);
