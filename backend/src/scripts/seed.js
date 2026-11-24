// Creates demo accounts. Safe to run repeatedly (existing emails are updated, not duplicated).
// Voter wallets are Hardhat accounts #1-#5, the same ones seed:local already authorized on chain.
const bcrypt = require("bcryptjs");
const { ethers } = require("ethers");
const connectDb = require("../db");
const User = require("../models/User");
const mongoose = require("mongoose");

const w = (a) => ethers.getAddress(a.toLowerCase());
const HARDHAT = [
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  "0x15d34AAf54267DB7D7c367839AAf71E00D2C689F",
  "0x9965507D1a55bcC2695C58ba16FB37d81554e5dc",
];

const accounts = [
  { name: "Election Admin", email: "admin@evoting.local", password: "Admin@12345", role: "admin", verificationStatus: "verified" },
  { name: "Candidate Demo", email: "candidate@evoting.local", password: "Candidate@12345", role: "candidate", studentId: "CS2021-100", verificationStatus: "verified" },
  { name: "Unverified Voter", email: "pending@evoting.local", password: "Voter@12345", role: "voter", studentId: "CS2021-099", verificationStatus: "pending" },
  ...HARDHAT.map((addr, i) => ({
    name: `Demo Voter ${i + 1}`,
    email: `voter${i + 1}@evoting.local`,
    password: "Voter@12345",
    role: "voter",
    studentId: `CS2021-0${i + 1}`,
    walletAddress: w(addr),
    verificationStatus: "verified",
  })),
];

(async () => {
  await connectDb();
  for (const { password, ...rest } of accounts) {
    await User.findOneAndUpdate(
      { email: rest.email },
      { ...rest, passwordHash: await bcrypt.hash(password, 12) },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`${rest.role.padEnd(9)} ${rest.email}  /  ${password}`);
  }
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
