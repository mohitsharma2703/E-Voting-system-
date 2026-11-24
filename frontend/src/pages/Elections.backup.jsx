import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchAllElections } from "../lib/contract";
import { errorMessage, fmtDate } from "../lib/format";
import { Spinner, StatusBadge } from "../components/ui";

const TABS = [["all", "All"], [1, "Active"], [0, "Upcoming"], [2, "Ended"]];

export default function Elections() {
  const [list, setList] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");

  useEffect(() => {
    fetchAllElections().then(setList).catch((e) => setError(errorMessage(e)));
  }, []);

  if (error) return <p className="rounded-md bg-bad-soft p-4 text-bad">{error}</p>;
  if (!list) return <Spinner label="Reading elections from the blockchain" />;
  const shown = list.filter((e) => tab === "all" || e.state === tab);

  return (
    <div>
      <h1 className="text-3xl font-bold">Elections</h1>
      <div className="mt-5 flex flex-wrap gap-2" role="tablist">
        {TABS.map(([key, label]) => (
          <button key={label} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium ${tab === key ? "border-indelible bg-indelible text-white" : "border-rule bg-white hover:bg-indelible-soft"}`}>
            {label}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="mt-8 rounded-md border border-dashed border-rule p-8 text-center text-mute">
          No elections here yet. {list.length === 0 && "Ask the admin to create one, or run the demo seed script."}
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-rule rounded-lg border border-rule bg-white">
          {shown.map((e) => (
            <li key={e.id}>
              <Link to={e.state === 2 ? `/results/${e.id}` : `/elections/${e.id}`} className="flex flex-wrap items-center justify-between gap-3 p-5 hover:bg-indelible-soft/50">
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold">{e.title}</p>
                  <p className="mt-1 text-sm text-mute">{fmtDate(e.startTime)} to {fmtDate(e.endTime)}</p>
                </div>
                <div className="flex items-center gap-4 text-sm text-mute">
                  <span>{e.candidateCount} candidates</span>
                  <StatusBadge state={e.state} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
