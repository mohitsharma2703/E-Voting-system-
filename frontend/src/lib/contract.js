// Single place that talks to the blockchain. Reads use the local RPC node directly;
// writes (transactions) go through MetaMask so the voter signs with their own wallet.
import { BrowserProvider, JsonRpcProvider, Contract } from "ethers";
import deployment from "../contracts/Voting.json"; // written by blockchain/scripts/deploy.js

export const CONTRACT_ADDRESS = deployment.address;
export const ABI = deployment.abi;
export const CHAIN_ID = deployment.chainId; // 31337 for Hardhat
export const RPC_URL = "http://127.0.0.1:8545";

export const rpcProvider = new JsonRpcProvider(RPC_URL);
let readContract;
export function getReadContract() {
  if (!readContract) readContract = new Contract(CONTRACT_ADDRESS, ABI, rpcProvider);
  return readContract;
}

export const hasWallet = () => typeof window !== "undefined" && Boolean(window.ethereum);

export async function getWriteContract() {
  if (!hasWallet()) throw new Error("MetaMask is not installed in this browser.");
  const signer = await new BrowserProvider(window.ethereum).getSigner();
  return new Contract(CONTRACT_ADDRESS, ABI, signer);
}

const chainHex = "0x" + CHAIN_ID.toString(16);
export async function switchToLocalChain() {
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainHex }] });
  } catch (err) {
    if (err?.code === 4902 || err?.data?.originalError?.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{ chainId: chainHex, chainName: "Hardhat Local", rpcUrls: [RPC_URL],
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 } }],
      });
    } else throw err;
  }
}

// ---- read helpers (plain JS objects for the UI) ----
export async function fetchElection(id) {
  const e = await getReadContract().getElection(id);
  return {
    id: Number(id), title: e.title, description: e.description,
    startTime: Number(e.startTime), endTime: Number(e.endTime), closed: e.closed,
    candidateCount: Number(e.candidateCount), totalVotes: Number(e.totalVotes), state: Number(e.state),
  };
}
export async function fetchAllElections() {
  const n = Number(await getReadContract().electionCount());
  const list = await Promise.all(Array.from({ length: n }, (_, i) => fetchElection(i + 1)));
  return list.reverse(); // newest first
}
export async function fetchCandidates(electionId, count) {
  const c = getReadContract();
  return Promise.all(
    Array.from({ length: count }, async (_, i) => {
      const r = await c.getCandidate(electionId, i + 1);
      return { id: i + 1, name: r.name, metadataURI: r.metadataURI, status: Number(r.status) };
    })
  );
}
