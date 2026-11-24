import { Link } from "react-router-dom";
import { CAND, stateLabel } from "../lib/format";
import { shortHash } from "../lib/format";

export function StatusBadge({ state }) {
  const tone = ["bg-warn-soft text-warn", "bg-ok-soft text-ok", "bg-rule text-mute"][state] ?? "bg-rule text-mute";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>
      {state === 1 && <span className="h-1.5 w-1.5 rounded-full bg-ok" />}
      {stateLabel(state)}
    </span>
  );
}

export function CandidateStatusBadge({ status }) {
  const map = { [CAND.PENDING]: ["Pending", "bg-warn-soft text-warn"], [CAND.APPROVED]: ["Approved", "bg-ok-soft text-ok"], [CAND.REJECTED]: ["Rejected", "bg-bad-soft text-bad"] };
  const [label, tone] = map[status];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{label}</span>;
}

export function Spinner({ label = "Loading" }) {
  return (
    <div className="flex items-center gap-3 py-10 text-sm text-mute" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-rule border-t-indelible" />
      {label}
    </div>
  );
}

export function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/50 p-4 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-xl font-bold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

// Shows the 3 stages of a transaction: wallet confirmation -> pending on chain -> confirmed/failed.
export function TxStatus({ tx }) {
  if (!tx || tx.phase === "idle") return null;
  const steps = [
    ["Confirm in MetaMask", ["wallet", "pending", "success"]],
    ["Waiting for the block", ["pending", "success"]],
    [tx.phase === "failed" ? "Failed" : "Confirmed on chain", ["success"]],
  ];
  const tone = tx.phase === "success" ? "border-ok bg-ok-soft" : tx.phase === "failed" ? "border-bad bg-bad-soft" : "border-indelible bg-indelible-soft";
  return (
    <div className={`rounded-lg border p-4 ${tone}`} role="status">
      <p className="font-semibold">{tx.label}</p>
      <ol className="mt-2 space-y-1 text-sm">
        {steps.map(([text, activeIn], i) => {
          const done = activeIn.includes(tx.phase) && !(i === 0 && tx.phase === "wallet");
          const failedLast = tx.phase === "failed" && i === 2;
          return (
            <li key={text} className={failedLast ? "font-semibold text-bad" : done ? "font-semibold text-ink" : "text-mute"}>
              {failedLast ? "x" : done ? "✓" : "•"} {text}
            </li>
          );
        })}
      </ol>
      {tx.error && <p className="mt-2 text-sm font-medium text-bad">{tx.error}</p>}
      {tx.hash && (
        <p className="mt-3 break-all text-xs text-mute">
          Transaction hash: <span className="font-mono text-ink">{tx.hash}</span>{" "}
          <Link className="font-semibold text-indelible underline" to={`/verify/${tx.hash}`}>Verify on chain</Link>
        </p>
      )}
    </div>
  );
}
export { shortHash };
