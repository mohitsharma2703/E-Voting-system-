
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { fetchElection, getReadContract } from "../lib/contract";
import { STATE, errorMessage, fmtDate } from "../lib/format";
import { Spinner, StatusBadge } from "../components/ui";

export default function Results() {
  const { id } = useParams();

  const [election, setElection] = useState(null);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setError("");

        const e = await fetchElection(id);
        if (cancelled) return;

        setElection(e);

        if (e.state === STATE.ENDED) {
          const r = await getReadContract().getResults(id);

          if (cancelled) return;

          setRows(
            r.candidateIds.map((cid, i) => ({
              id: Number(cid),
              name: r.names[i],
              votes: Number(r.voteCounts[i]),
            }))
          );
        } else {
          setRows(null);
        }
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-bold text-red-700">
          Unable to load election results
        </h2>
        <p className="mt-2 text-sm text-red-600">{error}</p>
        <Link to="/elections" className="btn btn-quiet mt-4 inline-flex">
          Back to elections
        </Link>
      </div>
    );
  }

  if (!election) {
    return <Spinner label="Reading election data from the blockchain" />;
  }

  if (election.state !== STATE.ENDED) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="panel overflow-hidden p-8 sm:p-10">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-3xl">
            ◷
          </div>

          <StatusBadge state={election.state} />

          <h1 className="mt-5 text-3xl font-bold text-slate-900">
            {election.title}
          </h1>

          <p className="mt-3 leading-7 text-mute">
            The election is not over yet. Results will be published
            automatically once the voting period has ended.
          </p>

          <div className="mt-6 rounded-xl border border-rule bg-purple-50/60 p-5">
            <p className="text-sm text-mute">Voting closes</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {fmtDate(election.endTime)}
            </p>
          </div>

          <Link
            to={`/elections/${id}`}
            className="btn btn-primary mt-7 inline-flex"
          >
            View election
          </Link>
        </div>
      </div>
    );
  }

  if (!rows) {
    return <Spinner label="Counting votes from the blockchain" />;
  }

  const total = rows.reduce((sum, r) => sum + r.votes, 0);
  const top = rows.length ? Math.max(...rows.map((r) => r.votes)) : 0;

  const leaders =
    total > 0 ? rows.filter((r) => r.votes === top) : [];

  const pct = (votes) =>
    total ? ((votes / total) * 100).toFixed(1) : "0.0";

  const summary =
    total === 0
      ? "No votes were cast in this election."
      : leaders.length > 1
        ? `A tie between ${leaders.map((l) => l.name).join(" and ")} with ${top} votes each.`
        : `${leaders[0].name} won with ${top} of ${total} votes (${pct(top)}%).`;

  return (
    <div className="space-y-7 pb-10">

      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#302078] via-[#49319a] to-[#7254bd] p-7 text-white shadow-lg sm:p-10">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10" />
        <div className="absolute -bottom-28 right-32 h-64 w-64 rounded-full bg-white/5" />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
              Official results
            </span>
            <StatusBadge state={STATE.ENDED} />
          </div>

          <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
            {election.title}
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-purple-100 sm:text-base">
            The election has concluded. Explore the final voting results
            recorded and verified on the blockchain.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/elections"
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#392584] transition hover:bg-purple-50"
            >
              View all elections →
            </Link>
            <Link
              to={`/verify`}
              className="rounded-xl border border-white/40 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Verify a vote
            </Link>
          </div>
        </div>
      </section>

      {/* Winner announcement */}
      <section className="panel border border-purple-100 bg-gradient-to-r from-purple-50 to-white p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-3xl">
            🏆
          </div>

          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-purple-600">
              {total === 0
                ? "Election summary"
                : leaders.length > 1
                  ? "Election result · Tie"
                  : "Election winner"}
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              {total === 0
                ? "No winner declared"
                : leaders.length > 1
                  ? "It's a tie!"
                  : leaders[0].name}
            </h2>

            <p className="mt-2 text-sm leading-6 text-mute">{summary}</p>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-mute">Total votes</p>
            <span className="rounded-lg bg-purple-100 p-2 text-purple-700">▤</span>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">{total}</p>
          <p className="mt-1 text-xs text-mute">Votes recorded on-chain</p>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-mute">Candidates</p>
            <span className="rounded-lg bg-indigo-100 p-2 text-indigo-700">♙</span>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">{rows.length}</p>
          <p className="mt-1 text-xs text-mute">Participating candidates</p>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-mute">Leading votes</p>
            <span className="rounded-lg bg-amber-100 p-2 text-amber-700">★</span>
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">{top}</p>
          <p className="mt-1 text-xs text-mute">Highest candidate vote count</p>
        </div>
      </section>

      {/* Chart */}
      <section className="panel p-5 sm:p-7">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">
            Voting breakdown
          </h2>
          <p className="mt-1 text-sm text-mute">
            Compare the votes received by each candidate.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-mute">
            No candidate results available.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rows}
                margin={{ top: 10, right: 12, left: -15, bottom: 5 }}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "#f3efff" }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e5e0f2",
                  }}
                />
                <Bar dataKey="votes" name="Votes" radius={[8, 8, 0, 0]}>
                  {rows.map((r) => (
                    <Cell
                      key={r.id}
                      fill={
                        r.votes === top && total > 0
                          ? "#49319a"
                          : "#b9addf"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Detailed results */}
      <section className="panel overflow-hidden">
        <div className="border-b border-rule p-5 sm:p-7">
          <h2 className="text-xl font-bold text-slate-900">
            Candidate performance
          </h2>
          <p className="mt-1 text-sm text-mute">
            Final votes and percentage share for each candidate.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-sm">
            <thead className="bg-purple-50/70 text-left text-mute">
              <tr>
                <th className="px-6 py-4 font-semibold">Candidate</th>
                <th className="px-6 py-4 text-right font-semibold">Votes</th>
                <th className="px-6 py-4 text-right font-semibold">Vote share</th>
                <th className="px-6 py-4 text-right font-semibold">Result</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => {
                const isLeader = total > 0 && r.votes === top;

                return (
                  <tr
                    key={r.id}
                    className="border-t border-rule transition hover:bg-purple-50/40"
                  >
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {r.name}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                      {r.votes}
                    </td>
                    <td className="px-6 py-4 text-right text-mute">
                      {pct(r.votes)}%
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isLeader ? (
                        <span className="inline-flex rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-800">
                          {leaders.length > 1 ? "Tied" : "Winner"}
                        </span>
                      ) : (
                        <span className="text-xs text-mute">Participant</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Blockchain notice */}
      <section className="rounded-2xl border border-green-200 bg-green-50 p-5">
        <div className="flex gap-3">
          <span className="text-xl">✓</span>
          <div>
            <h3 className="font-semibold text-green-900">
              Blockchain-verified results
            </h3>
            <p className="mt-1 text-sm leading-6 text-green-800">
              These results are retrieved directly from the deployed smart
              contract. The displayed total votes recorded on-chain:
              {" "}{election.totalVotes}.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
