const { ethers } = require("ethers");
const { HttpError } = require("./error");

const str = (v) => (typeof v === "string" ? v.trim() : "");

const email = (v) => {
  const s = str(v).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) || s.length > 120) throw new HttpError(400, "Enter a valid email address.");
  return s;
};

const password = (v) => {
  if (typeof v !== "string" || v.length < 8 || v.length > 72) throw new HttpError(400, "Password must be 8 to 72 characters.");
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) throw new HttpError(400, "Password must contain a letter and a number.");
  return v;
};

const name = (v) => {
  const s = str(v);
  if (s.length < 2 || s.length > 80) throw new HttpError(400, "Name must be 2 to 80 characters.");
  return s;
};

// Returns the checksummed address, or undefined if empty.
const wallet = (v) => {
  const s = str(v);
  if (!s) return undefined;
  if (!ethers.isAddress(s)) throw new HttpError(400, "Wallet address is not valid.");
  return ethers.getAddress(s.toLowerCase());
};

const electionId = (v) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new HttpError(400, "electionId must be a positive whole number.");
  return n;
};

module.exports = { str, email, password, name, wallet, electionId };
