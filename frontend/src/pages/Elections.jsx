
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAllElections } from "../lib/contract";
import { errorMessage, fmtDate } from "../lib/format";
import { Spinner, StatusBadge } from "../components/ui";

const TABS = [
  ["all", "All elections"],
  [1, "Active"],
  [0, "Upcoming"],
  [2, "Completed"],
];

export default function Elections() {
  const [list, setList] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");

  useEffect(() => {
    fetchAllElections()
      .then(setList)
      .catch((e) => setError(errorMessage(e)));
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-bad/20 bg-bad-soft p-6 text-bad">
        <h2 className="font-bold">Unable to load elections</h2>
        <p className="mt-2 text-sm">{error}</p>
        <button
          className="btn btn-quiet mt-4"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="py-20">
        <Spinner label="Reading elections from the blockchain" />
      </div>
    );
  }

  const shown = list.filter((e) => tab === "all" || e.state === tab);
  const activeCount = list.filter((e) => e.state === 1).length;
  const upcomingCount = list.filter((e) => e.state === 0).length;
  const endedCount = list.filter((e) => e.state === 2).length;

  const stats = [
    { label: "Total elections", value: list.length, icon: "◈" },
    { label: "Currently active", value: activeCount, icon: "●" },
    { label: "Upcoming", value: upcomingCount, icon: "◷" },
    { label: "Completed", value: endedCount, icon: "✓" },
  ];

  return (
    <div className="space-y-9 pb-12">
      <section className="relative overflow-hidden rounded-3xl bg-indelible px-7 py-10 text-white sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-200">
            Blockchain-based voting
          </p>
          <h1 className="mt-4 font-display text-4xl font-extrabold sm:text-5xl">
            Explore elections.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-purple-100 sm:text-base">
            Discover available elections, view candidates and participate
            using your authorized blockchain wallet.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-rule bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-mute">{stat.label}</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indelible-soft font-bold text-indelible">
                {stat.icon}
              </span>
            </div>
            <p className="mt-3 font-display text-3xl font-extrabold">
              {stat.value}
            </p>
          </div>
        ))}
      </section>

      <section>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indelible">
              Browse and participate
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
              Available elections
            </h2>
            <p className="mt-2 text-sm text-mute">
              Election information is retrieved directly from the blockchain.
            </p>
          </div>
          <span className="text-sm font-medium text-mute">
            {shown.length} {shown.length === 1 ? "election" : "elections"} found
          </span>
        </div>

        <div
          className="mt-6 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Filter elections"
        >
          {TABS.map(([key, label]) => (
            <button
              key={label}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors ${
                tab === key
                  ? "border-indelible bg-indelible text-white"
                  : "border-rule bg-white text-mute hover:bg-indelible-soft hover:text-indelible"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <div className="mt-7 rounded-2xl border border-dashed border-rule bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indelible-soft text-2xl text-indelible">
              ◈
            </div>
            <h3 className="mt-5 font-display text-xl font-bold">
              No elections found
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-mute">
              {list.length === 0
                ? "There are currently no elections on the connected blockchain. Ask the administrator to create an election."
                : "There are no elections in this category. Try selecting another filter."}
            </p>
            {tab !== "all" && (
              <button
                className="btn btn-primary mt-5"
                onClick={() => setTab("all")}
              >
                View all elections
              </button>
            )}
          </div>
        ) : (
          <div className="mt-7 grid gap-5 md:grid-cols-2">
            {shown.map((e) => (
              <Link
                key={e.id}
                to={
                  e.state === 2
                    ? `/results/${e.id}`
                    : `/elections/${e.id}`
                }
                className="group rounded-2xl border border-rule bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-indelible/40 hover:shadow-xl"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-lg bg-indelible-soft px-3 py-1.5 text-xs font-bold text-indelible">
                    ELECTION #{e.id}
                  </span>
                  <StatusBadge state={e.state} />
                </div>

                <h3 className="mt-6 font-display text-xl font-bold transition-colors group-hover:text-indelible">
                  {e.title}
                </h3>

                {e.description && (
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-mute">
                    {e.description}
                  </p>
                )}

                <div className="mt-5 space-y-3 border-t border-rule pt-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-mute">Voting opens</span>
                    <span className="font-medium">
                      {fmtDate(e.startTime)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-mute">Voting closes</span>
                    <span className="font-medium">
                      {fmtDate(e.endTime)}
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-rule pt-4">
                  <div className="flex gap-5 text-xs text-mute">
                    <span>
                      <b className="text-ink">{e.candidateCount}</b>{" "}
                      Candidates
                    </span>
                    <span>
                      <b className="text-ink">{e.totalVotes}</b>{" "}
                      Votes
                    </span>
                  </div>
                  <span className="text-sm font-bold text-indelible transition-transform group-hover:translate-x-1">
                    {e.state === 2 ? "View results →" : "View election →"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-indelible/15 bg-indelible-soft p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-xl text-indelible">
            ⛓
          </span>
          <div>
            <h3 className="font-display font-bold">
              Transparent blockchain records
            </h3>
            <p className="mt-1 text-sm leading-6 text-mute">
              Election status, candidate information and voting activity are
              read from the connected smart contract. Completed election
              results can be independently inspected.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
