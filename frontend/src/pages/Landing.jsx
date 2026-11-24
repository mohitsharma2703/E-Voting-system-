
import { Link } from "react-router-dom";

function BallotSlip() {
  const candidates = [
    { name: "Riya Verma", role: "Candidate 01", selected: false },
    { name: "Arjun Mehta", role: "Candidate 02", selected: true },
    { name: "Sana Khan", role: "Candidate 03", selected: false },
  ];

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute -inset-4 rounded-3xl bg-indelible/10 blur-2xl" />
      <div className="relative rotate-1 rounded-2xl border border-rule bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-center justify-between border-b border-dashed border-rule pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indelible">
              Sample ballot
            </p>
            <h3 className="mt-2 font-display text-xl font-bold">
              Student Council 2026
            </h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indelible-soft text-2xl">
            ✓
          </div>
        </div>

        <div className="py-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold">Select a candidate</p>
            <span className="rounded-full bg-ok-soft px-3 py-1 text-xs font-semibold text-ok">
              Demo preview
            </span>
          </div>

          <div className="space-y-3">
            {candidates.map((candidate) => (
              <div
                key={candidate.name}
                className={`flex items-center gap-4 rounded-xl border p-4 ${
                  candidate.selected
                    ? "border-indelible bg-indelible-soft"
                    : "border-rule bg-white"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                    candidate.selected
                      ? "border-indelible bg-indelible text-white"
                      : "border-rule"
                  }`}
                >
                  {candidate.selected && (
                    <span className="text-xs">✓</span>
                  )}
                </span>
                <div>
                  <p className="font-semibold">{candidate.name}</p>
                  <p className="mt-0.5 text-xs text-mute">
                    {candidate.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-paper p-4">
          <div className="flex items-center justify-between text-xs text-mute">
            <span>Network</span>
            <span className="font-semibold text-indelible">
              Hardhat Local
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-mute">
            <span>Security</span>
            <span className="font-semibold text-ok">
              Smart contract protected
            </span>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-mute">
          Illustrative preview — no actual vote is submitted here.
        </p>
      </div>
    </div>
  );
}

const features = [
  {
    icon: "◈",
    title: "Blockchain powered",
    description:
      "Voting records are stored through smart contract transactions on the blockchain.",
  },
  {
    icon: "◎",
    title: "Wallet based voting",
    description:
      "Eligible voters connect their own MetaMask wallet to participate.",
  },
  {
    icon: "⌕",
    title: "Public verification",
    description:
      "Transaction hashes let users inspect recorded blockchain activity.",
  },
];

const steps = [
  {
    number: "01",
    title: "Election creation",
    description:
      "The administrator creates an election, adds candidates and authorizes voter wallets.",
  },
  {
    number: "02",
    title: "Wallet connection",
    description:
      "Eligible voters connect MetaMask using their own blockchain wallet.",
  },
  {
    number: "03",
    title: "Secure vote casting",
    description:
      "The smart contract checks eligibility and prevents a wallet from voting twice.",
  },
  {
    number: "04",
    title: "Transparent results",
    description:
      "After the election ends, results can be read from the blockchain.",
  },
];

export default function Landing() {
  return (
    <div className="space-y-24 pb-12">
      <section className="relative overflow-hidden rounded-3xl border border-rule bg-white px-6 py-12 sm:px-10 sm:py-16 lg:px-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indelible-soft blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-purple-100 blur-3xl" />

        <div className="relative grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-indelible/20 bg-indelible-soft px-4 py-2 text-xs font-semibold text-indelible">
              <span className="h-2 w-2 rounded-full bg-ok" />
              SECURE · TRANSPARENT · DECENTRALIZED
            </span>

            <h1 className="mt-7 max-w-2xl font-display text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">
              Your vote.
              <span className="block text-indelible">
                Your voice.
              </span>
              <span className="block">On the blockchain.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-mute sm:text-lg">
              A blockchain-based electronic voting system designed to make
              elections more transparent, verifiable and secure through
              smart contracts.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/elections" className="btn btn-primary px-6 py-3">
                Explore elections <span aria-hidden="true">→</span>
              </Link>
              <Link to="/verify" className="btn btn-quiet px-6 py-3">
                Verify a transaction
              </Link>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-xs font-medium text-mute">
              <span>✓ Smart contract based</span>
              <span>✓ MetaMask integration</span>
              <span>✓ On-chain verification</span>
            </div>
          </div>

          <BallotSlip />
        </div>
      </section>

      <section>
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-indelible">
            Why blockchain voting?
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            Built around trust and transparency.
          </h2>
          <p className="mt-3 leading-7 text-mute">
            The system uses blockchain technology to make the voting process
            easier to inspect and verify.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-rule bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indelible-soft font-display text-2xl font-bold text-indelible">
                {feature.icon}
              </div>
              <h3 className="mt-5 font-display text-xl font-bold">
                {feature.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-mute">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-indelible px-6 py-10 text-white sm:px-10 sm:py-14">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-200">
            The process
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            How your vote travels
          </h2>
          <p className="mt-3 leading-7 text-purple-100">
            Four simple stages connect the voter, administrator and
            blockchain.
          </p>
        </div>

        <div className="mt-9 grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div
              key={step.number}
              className="border-t border-white/30 pt-5"
            >
              <p className="font-display text-3xl font-bold text-purple-200">
                {step.number}
              </p>
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-7 text-purple-100">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid items-center gap-8 rounded-3xl border border-rule bg-white p-7 sm:p-10 md:grid-cols-[1fr_auto]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-indelible">
            Ready to participate?
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold">
            Explore the elections.
          </h2>
          <p className="mt-3 max-w-xl leading-7 text-mute">
            View available elections, check their status and connect your
            wallet when you are ready to participate.
          </p>
        </div>
        <Link to="/elections" className="btn btn-primary px-6 py-3">
          View elections →
        </Link>
      </section>

      <section className="rounded-2xl border border-warn/30 bg-warn-soft p-6 sm:p-8">
        <h2 className="font-display text-xl font-bold text-warn">
          Important project limitations
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-ink">
          <li>
            Wallet addresses are visible on the blockchain. This prototype
            does not provide a fully secret ballot.
          </li>
          <li>
            One vote per wallet does not guarantee one vote per person.
            Identity verification is a separate requirement.
          </li>
          <li>
            This is an academic prototype using a local test blockchain
            and is not intended for real-world elections.
          </li>
        </ul>
      </section>
    </div>
  );
}
