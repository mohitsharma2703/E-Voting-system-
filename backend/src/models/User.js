const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["admin", "voter", "candidate"], default: "voter" },
    studentId: { type: String, trim: true, maxlength: 40 },
    // Checksummed address. Omitted (not null) when unset so the sparse unique index works.
    walletAddress: { type: String, unique: true, sparse: true },
    // Off-chain identity check done by the admin. The chain only knows wallets, not people.
    verificationStatus: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },
    authorizedElections: [
      {
        _id: false,
        electionId: Number,
        txHash: String,
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);
