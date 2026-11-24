
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Interface } from "ethers";

import {
  ABI,
  CONTRACT_ADDRESS,
  rpcProvider,
} from "../lib/contract";

import { errorMessage, fmtDate } from "../lib/format";
import { Spinner } from "../components/ui";

const iface = new Interface(ABI);

function DetailRow({ label, value, mono = false }) {
  return (
    <div className="grid gap-2 border-b border-rule py-4 last:border-0 sm:grid-cols-[180px_1fr]">
      <dt className="text-sm font-medium text-mute">{label}</dt>
      <dd className={`break-all text-sm text-slate-800 ${mono ? "font-mono" : ""}`}>
        {value ?? "Not available"}
      </dd>
    </div>
  );
}

export default function Verify() {
  const { hash } = useParams();
  const navigate = useNavigate();

  const [input, setInput] = useState(hash ?? "");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setInput(hash ?? "");
    setData(null);
    setError("");

    if (!hash) {
      setLoading(false);
      return;
    }

    setLoading(true);

    (async () => {
      try {
        const [receipt, tx] = await Promise.all([
          rpcProvider.getTransactionReceipt(hash),
          rpcProvider.getTransaction(hash),
        ]);

        if (!receipt || !tx) {
          throw new Error(
            "No transaction with this hash exists on the connected blockchain. Check the hash and make sure the local node has not been restarted."
          );
        }

        const block = await rpcProvider.getBlock(receipt.blockNumber);

        if (!block) {
          throw new Error("Unable to retrieve the transaction block.");
        }

        const events = receipt.logs
          .filter(
            (log) =>
              log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()
          )
          .map((log) => {
            try {
              return iface.parseLog(log);
            } catch {
              return null;
            }
          })
          .filter(Boolean)
          .map((parsed) => ({
            name: parsed.name,
            args: parsed.fragment.inputs
              .map(
                (item, index) =>
                  `${item.name}: ${parsed.args[index].toString()}`
              )
              .join(", "),
          }));

        if (!cancelled) {
          setData({ receipt, tx, block, events });
        }
      } catch (err) {
        if (!cancelled) {
          setError(errorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hash]);

  const submit = (e) => {
    e.preventDefault();

    const transactionHash = input.trim();

    if (!transactionHash) {
      setError("Please enter a transaction hash.");
      return;
    }

    navigate(`/verify/${transactionHash}`);
  };

  const success = data?.receipt.status === 1;

  return (
    <div className="mx-auto max-w-5xl space-y-7 pb-10">

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#302078] via-[#49319a] to-[#7254bd] p-7 text-white shadow-lg sm:p-10">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10" />
        <div className="absolute -bottom-28 right-32 h-64 w-64 rounded-full bg-white/5" />

        <div className="relative z-10">
          <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
            Blockchain transparency
          </span>

          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
            Verify a transaction
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-purple-100 sm:text-base">
            Independently verify transaction details recorded on the
            blockchain. Check transaction status, block information,
            wallet addresses and smart contract events.
          </p>
        </div>
      </section>

      {/* Search */}
      <section className="panel p-5 sm:p-7">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-900">
            Transaction lookup
          </h2>
          <p className="mt-1 text-sm text-mute">
            Enter the transaction hash generated after voting or
            creating an election.
          </p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
          <input
            className="field min-w-0 flex-1 font-mono text-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="0x..."
            aria-label="Transaction hash"
          />

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary min-w-32"
          >
            {loading ? "Checking..." : "Verify transaction"}
          </button>
        </form>

        <p className="mt-3 text-xs text-mute">
          Verification is performed directly against the configured
          blockchain node, not the application database.
        </p>
      </section>

      {/* Loading */}
      {loading && (
        <div className="panel p-8">
          <Spinner label="Searching the blockchain for your transaction" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <div className="flex gap-3">
            <span className="text-xl">!</span>
            <div>
              <h3 className="font-bold text-red-800">
                Transaction verification failed
              </h3>
              <p className="mt-2 break-words text-sm leading-6 text-red-700">
                {error}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Results */}
      {data && !loading && (
        <>
          {/* Status */}
          <section
            className={`rounded-2xl border p-6 sm:p-8 ${
              success
                ? "border-green-200 bg-green-50"
                : "border-red-200 bg-red-50"
            }`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold ${
                  success
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {success ? "✓" : "✕"}
              </div>

              <div>
                <p
                  className={`text-xs font-bold uppercase tracking-widest ${
                    success ? "text-green-700" : "text-red-700"
                  }`}
                >
                  Transaction status
                </p>

                <h2
                  className={`mt-1 text-2xl font-bold ${
                    success ? "text-green-900" : "text-red-900"
                  }`}
                >
                  {success ? "Transaction successful" : "Transaction failed"}
                </h2>

                <p
                  className={`mt-2 text-sm ${
                    success ? "text-green-800" : "text-red-800"
                  }`}
                >
                  {success
                    ? "This transaction was successfully recorded in a blockchain block."
                    : "This transaction was reverted or failed during execution."}
                </p>
              </div>
            </div>
          </section>

          {/* Summary cards */}
          <section className="grid gap-4 sm:grid-cols-3">
            <div className="panel p-5">
              <p className="text-sm text-mute">Block number</p>
              <p className="mt-3 text-2xl font-bold text-slate-900">
                {data.receipt.blockNumber}
              </p>
            </div>

            <div className="panel p-5">
              <p className="text-sm text-mute">Gas used</p>
              <p className="mt-3 text-2xl font-bold text-slate-900">
                {data.receipt.gasUsed.toString()}
              </p>
            </div>

            <div className="panel p-5">
              <p className="text-sm text-mute">Contract events</p>
              <p className="mt-3 text-2xl font-bold text-slate-900">
                {data.events.length}
              </p>
            </div>
          </section>

          {/* Transaction details */}
          <section className="panel p-5 sm:p-7">
            <div className="mb-5 border-b border-rule pb-4">
              <h2 className="text-xl font-bold text-slate-900">
                Transaction details
              </h2>
              <p className="mt-1 text-sm text-mute">
                Information retrieved from the blockchain.
              </p>
            </div>

            <dl>
              <DetailRow
                label="Transaction hash"
                value={data.tx.hash}
                mono
              />

              <DetailRow
                label="Block number"
                value={data.receipt.blockNumber}
              />

              <DetailRow
                label="Timestamp"
                value={fmtDate(data.block.timestamp)}
              />

              <DetailRow
                label="From wallet"
                value={data.tx.from}
                mono
              />

              <DetailRow
                label="To address"
                value={
                  <>
                    {data.tx.to ?? "Contract creation"}
                    {data.tx.to?.toLowerCase() ===
                      CONTRACT_ADDRESS.toLowerCase() &&
                      " (Voting contract)"}
                  </>
                }
                mono
              />

              <DetailRow
                label="Gas used"
                value={data.receipt.gasUsed.toString()}
              />

              <DetailRow
                label="Block hash"
                value={data.block.hash}
                mono
              />

              <DetailRow
                label="Previous block hash"
                value={data.block.parentHash}
                mono
              />
            </dl>
          </section>

          {/* Events */}
          <section className="panel p-5 sm:p-7">
            <h2 className="text-xl font-bold text-slate-900">
              Smart contract events
            </h2>

            <p className="mt-1 text-sm text-mute">
              Events emitted by the E-Voting smart contract in this transaction.
            </p>

            {data.events.length ? (
              <div className="mt-5 space-y-3">
                {data.events.map((event, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-purple-100 bg-purple-50/60 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold text-purple-900">
                        {event.name}
                      </h3>
                      <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800">
                        On-chain event
                      </span>
                    </div>

                    <p className="mt-3 break-all font-mono text-xs leading-6 text-slate-600">
                      {event.args}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-mute">
                No events from the E-Voting contract were emitted
                in this transaction.
              </p>
            )}
          </section>

          {/* Blockchain explanation */}
          <section className="rounded-2xl border border-purple-200 bg-purple-50 p-6">
            <div className="flex gap-3">
              <span className="text-2xl">🔗</span>
              <div>
                <h3 className="font-bold text-purple-950">
                  How blockchain ensures transparency
                </h3>

                <p className="mt-2 text-sm leading-7 text-purple-900">
                  Every block contains its own cryptographic hash and
                  the hash of the previous block. If recorded transaction
                  data is changed, the block hash changes, making the
                  modification detectable through the chain.
                </p>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Empty state */}
      {!hash && !loading && !error && (
        <section className="panel p-8 text-center sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100 text-3xl">
            🔍
          </div>

          <h2 className="mt-5 text-xl font-bold text-slate-900">
            Ready to verify
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-mute">
            Enter a transaction hash above to inspect its blockchain
            record and verify its status.
          </p>
        </section>
      )}

    </div>
  );
}
