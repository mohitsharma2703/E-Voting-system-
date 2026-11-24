export const STATE = { UPCOMING: 0, ACTIVE: 1, ENDED: 2 };
export const CAND = { PENDING: 0, APPROVED: 1, REJECTED: 2 };
export const stateLabel = (s) => ["Upcoming", "Active", "Ended"][s] ?? "Unknown";
export const shortAddr = (a) => (a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "");
export const shortHash = (h) => (h ? `${h.slice(0, 10)}...${h.slice(-8)}` : "");
export const fmtDate = (ts) =>
  new Date(Number(ts) * 1000).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
export const toUnix = (dtLocal) => Math.floor(new Date(dtLocal).getTime() / 1000);
export const toInputValue = (date) => {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
};

// Turns the many shapes of ethers/MetaMask errors into one readable sentence.
export function errorMessage(e) {
  if (e?.code === "ACTION_REJECTED" || e?.info?.error?.code === 4001) return "You rejected the request in MetaMask.";
  if (e?.revert?.name === "OwnableUnauthorizedAccount") return "Only the admin wallet can do this.";
  if (e?.revert?.args?.[0] && typeof e.revert.args[0] === "string") return e.revert.args[0];
  if (e?.reason) return e.reason.replace(/^execution reverted:?\s*/i, "");
  const raw = e?.info?.error?.message || e?.error?.message || e?.shortMessage || e?.message || "Something went wrong.";
  const m = raw.match(/reverted with reason string '([^']+)'/);
  if (m) return m[1];
  if (/failed to fetch|ECONNREFUSED|network error/i.test(raw)) return "Cannot reach the local blockchain. Is `npx hardhat node` running?";
  return raw;
}
