const { ethers } = require("ethers");
const config = require("../config");
const artifact = require("../contracts/Voting.json");
const { HttpError } = require("../middleware/error");

const STATES = ["Upcoming", "Active", "Ended"];
const address = config.contractAddress || artifact.address;
const provider = new ethers.JsonRpcProvider(config.rpcUrl);
const readContract = new ethers.Contract(address, artifact.abi, provider);

let signer = null;
let writeContract = null;
if (config.adminPrivateKey) {
  signer = new ethers.Wallet(config.adminPrivateKey, provider);
  writeContract = new ethers.Contract(address, artifact.abi, signer);
}

// One signer = one nonce sequence, so transactions are sent strictly one after another.
let queue = Promise.resolve();
const enqueue = (fn) => {
  const run = queue.then(fn);
  queue = run.catch(() => {});
  return run;
};

function mapChainError(err) {
  if (err instanceof HttpError) return err;
  if (err.code === "ECONNREFUSED" || err.code === "NETWORK_ERROR" || /could not detect network|ECONNREFUSED/i.test(err.message || "")) {
    return new HttpError(503, "Blockchain node is not reachable. Is `npx hardhat node` running?");
  }
  // Solidity require() messages arrive as err.reason on ethers v6 CALL_EXCEPTION.
  const reason = err.reason || err.revert?.args?.[0] || err.info?.error?.message;
  if (reason) return new HttpError(400, `Blockchain rejected the action: ${reason}`);
  return new HttpError(502, `Blockchain error: ${err.shortMessage || err.message}`);
}

async function sendTx(method, args) {
  if (!writeContract) throw new HttpError(503, "ADMIN_PRIVATE_KEY is not configured, so the server cannot send transactions.");
  try {
    return await enqueue(async () => {
      const tx = await writeContract[method](...args);
      const receipt = await tx.wait();
      return { txHash: tx.hash, receipt };
    });
  } catch (err) {
    throw mapChainError(err);
  }
}

async function call(fn) {
  try {
    return await fn();
  } catch (err) {
    throw mapChainError(err);
  }
}

// Returns election info, or null if it does not exist on chain.
async function getElection(electionId) {
  try {
    const e = await readContract.getElection(electionId);
    return {
      id: Number(electionId),
      title: e.title,
      startTime: Number(e.startTime),
      endTime: Number(e.endTime),
      closed: e.closed,
      candidateCount: Number(e.candidateCount),
      totalVotes: Number(e.totalVotes),
      state: STATES[Number(e.state)],
    };
  } catch (err) {
    if (err.reason === "Election does not exist") return null;
    throw mapChainError(err);
  }
}

// Reads a candidate id out of the CandidateRegistered event in a receipt.
function candidateIdFromReceipt(receipt) {
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== address.toLowerCase()) continue;
    const parsed = readContract.interface.parseLog(log);
    if (parsed && parsed.name === "CandidateRegistered") return Number(parsed.args.candidateId);
  }
  throw new HttpError(502, "Transaction succeeded but no CandidateRegistered event was found.");
}

async function getStatus() {
  const net = await call(() => provider.getNetwork());
  const [block, owner, electionCount] = await call(() =>
    Promise.all([provider.getBlockNumber(), readContract.owner(), readContract.electionCount()])
  );
  return {
    connected: true,
    chainId: Number(net.chainId),
    expectedChainId: artifact.chainId,
    blockNumber: block,
    contractAddress: address,
    contractOwner: owner,
    serverSigner: signer ? signer.address : null,
    signerIsOwner: signer ? signer.address.toLowerCase() === owner.toLowerCase() : false,
    electionCount: Number(electionCount),
  };
}

// Verifies a transaction hash against OUR contract and decodes its events.
async function inspectTx(hash) {
  const receipt = await call(() => provider.getTransactionReceipt(hash));
  if (!receipt) return null;
  const block = await call(() => provider.getBlock(receipt.blockNumber));
  const events = [];
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== address.toLowerCase()) continue;
    try {
      const p = readContract.interface.parseLog(log);
      const args = {};
      p.fragment.inputs.forEach((inp, i) => (args[inp.name] = p.args[i].toString()));
      events.push({ name: p.name, args });
    } catch {
      /* log from our address but not in the ABI: ignore */
    }
  }
  return {
    txHash: hash,
    status: receipt.status === 1 ? "success" : "failed",
    blockNumber: receipt.blockNumber,
    blockHash: block.hash,
    parentHash: block.parentHash,
    timestamp: block.timestamp,
    from: receipt.from,
    to: receipt.to,
    gasUsed: receipt.gasUsed.toString(),
    toOurContract: (receipt.to || "").toLowerCase() === address.toLowerCase(),
    events,
  };
}

module.exports = {
  readContract,
  getElection,
  getStatus,
  inspectTx,
  candidateIdFromReceipt,
  isAuthorized: (electionId, wallet) => call(() => readContract.isAuthorized(electionId, wallet)),
  hasVoted: (electionId, wallet) => call(() => readContract.hasAddressVoted(electionId, wallet)),
  addCandidate: (electionId, name, uri) => sendTx("addCandidate", [electionId, name, uri]),
  approveCandidate: (electionId, candidateId) => sendTx("approveCandidate", [electionId, candidateId]),
  rejectCandidate: (electionId, candidateId) => sendTx("rejectCandidate", [electionId, candidateId]),
  authorizeVoter: (electionId, wallet) => sendTx("authorizeVoter", [electionId, wallet]),
  authorizeVoters: (electionId, wallets) => sendTx("authorizeVoters", [electionId, wallets]),
};
