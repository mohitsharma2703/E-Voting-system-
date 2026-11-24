import { Link } from "react-router-dom";

function BallotSlip() {
  const rows = ["Riya Verma", "Arjun Mehta", "Sana Khan"];
  return (
    <div className="relative mx-auto w-full max-w-sm rotate-1 rounded-sm border border-rule bg-white p-6 shadow-[6px_6px_0_var(--color-indelible-soft)]" aria-hidden="true">
      <p className="font-display text-lg font-bold">Student Council 2026</p>
      <p className="mb-4 border-b border-dashed border-rule pb-3 text-xs text-mute">Mark one candidate</p>
      {rows.map((r, i) => (
        <div key={r} className="flex items-center gap-3 border-b border-rule py-3 last:border-0">
          <span className={`relative h-6 w-6 rounded-full border-2 ${i === 1 ? "border-indelible" : "border-rule"}`}>
            {i === 1 && <span className="stamp absolute -inset-1 rounded-full bg-indelible/90" />}
          </span>
          <span className="text-sm font-medium">{r}</span>
        </div>
      ))}
      <p className="mt-4 font-mono text-[11px] text-mute">tx 0x9f2c...b71e · block 42 · confirmed</p>
    </div>
  );
}

export default function Landing() {
  const steps = [
    ["Admin sets up the election", "Candidates are added and approved, voter wallets are authorized, and the start and end times are fixed on the smart contract."],
    ["Voter connects MetaMask", "The voter signs in with their own wallet. The platform never sees a private key."],
    ["Vote is sent as a transaction", "The contract checks the wallet is authorized, the election is open, and the wallet has not voted. Only then is the vote counted."],
    ["Anyone can verify", "Paste the transaction hash into the Verify page to read the record straight from the blockchain."],
  ];
  return (
    <div className="space-y-20">
      <section className="grid items-center gap-10 pt-4 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">Cast your vote from your own wallet. Check the record yourself.</h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-mute">
            E-Voting System runs elections on a smart contract. Rules such as one vote per wallet and fixed voting hours are enforced by code, and every vote leaves a transaction you can look up.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/elections" className="btn btn-primary">See elections</Link>
            <Link to="/verify" className="btn btn-quiet">Verify a transaction</Link>
          </div>
        </div>
        <BallotSlip />
      </section>

      <section>
        <h2 className="text-2xl font-bold">How a vote travels</h2>
        <ol className="mt-6 grid gap-x-10 gap-y-6 md:grid-cols-2">
          {steps.map(([t, d], i) => (
            <li key={t} className="flex gap-4 border-t border-rule pt-4">
              <span className="font-display text-2xl font-bold text-indelible">{i + 1}</span>
              <div><h3 className="font-semibold">{t}</h3><p className="mt-1 text-sm leading-relaxed text-mute">{d}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-lg border border-warn/40 bg-warn-soft p-6">
        <h2 className="text-xl font-bold text-warn">What this prototype does not promise</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink">
          <li>A vote is linked to a wallet address that anyone can see. This is pseudonymous voting, not a secret ballot.</li>
          <li>One vote per wallet is not one vote per person. Real identity checks are outside what the blockchain can do.</li>
          <li>It cannot stop someone being pressured to show how they voted.</li>
          <li>It runs on a local test chain for a college project and is not suitable for real elections.</li>
        </ul>
        <p className="mt-3 text-sm text-mute">Future work: zero-knowledge proofs, blind signatures and receipt-free voting.</p>
      </section>
    </div>
  );
}
