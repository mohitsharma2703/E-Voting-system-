
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { isAddress } from "ethers";
import {
  fetchAllElections,
  fetchCandidates,
  getReadContract,
  getWriteContract,
} from "../lib/contract";
import {
  CAND,
  STATE,
  errorMessage,
  fmtDate,
  shortAddr,
  shortHash,
  toInputValue,
  toUnix,
} from "../lib/format";
import {
  CandidateStatusBadge,
  Spinner,
  StatusBadge,
  TxStatus,
} from "../components/ui";
import { useWallet } from "../context/WalletContext";
import { useTx } from "../lib/useTx";
import { useToast } from "../components/Toast";

export default function Admin() {
  const { account, connect, isAdmin, onRightChain, switchChain, owner } =
    useWallet();

  const toast = useToast();
  const { tx, run } = useTx();

  const [elections, setElections] = useState(null);
  const [selId, setSelId] = useState(null);
  const [cands, setCands] = useState([]);
  const [activity, setActivity] = useState([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    start: toInputValue(new Date(Date.now() + 5 * 60000)),
    end: toInputValue(new Date(Date.now() + 65 * 60000)),
  });

  const [candForm, setCandForm] = useState({ name: "", note: "" });
  const [voterText, setVoterText] = useState("");

  const sel = elections?.find((e) => e.id === selId);

  const load = useCallback(async () => {
    try {
      const list = await fetchAllElections();
      setElections(list);

      const id = selId ?? list[0]?.id ?? null;
      setSelId(id);

      const e = list.find((x) => x.id === id);
      setCands(e ? await fetchCandidates(id, e.candidateCount) : []);

      const logs = id
        ? await getReadContract().queryFilter("*", 0, "latest")
        : [];

      setActivity(
        logs
          .filter((l) => l.eventName && Number(l.args?.[0]) === id)
          .slice(-25)
          .reverse()
      );
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }, [selId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (!account) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-rule bg-white p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indelible-soft text-3xl text-indelible">
          ◈
        </div>
        <h1 className="mt-5 text-2xl font-bold text-ink">Admin dashboard</h1>
        <p className="mt-3 text-sm leading-6 text-mute">
          Connect the contract owner wallet to access election management,
          candidate approvals and voter authorization.
        </p>
        <button className="btn btn-primary mt-6" onClick={connect}>
          Connect admin wallet
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-rule bg-white p-8 text-center shadow-sm">
        <div className="text-4xl text-indelible">🔐</div>
        <h1 className="mt-4 text-2xl font-bold text-ink">Admin access only</h1>
        <p className="mt-3 text-sm leading-6 text-mute">
          This wallet is not the contract owner. Switch MetaMask to the owner
          account {owner ? `(${shortAddr(owner)}, Hardhat account #0)` : ""}.
        </p>
      </div>
    );
  }

  if (!onRightChain) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-rule bg-white p-8 text-center shadow-sm">
        <div className="text-4xl text-indelible">🌐</div>
        <h1 className="mt-4 text-2xl font-bold text-ink">Wrong network</h1>
        <p className="mt-2 text-sm text-mute">
          Connect MetaMask to the Hardhat Local network before managing
          elections.
        </p>
        <button className="btn btn-primary mt-5" onClick={switchChain}>
          Switch to Hardhat network
        </button>
      </div>
    );
  }

  if (!elections) {
    return <Spinner label="Loading administration dashboard" />;
  }

  const write = (label, fn) =>
    run(label, async () => fn(await getWriteContract()), load);

  const createElection = (e) => {
    e.preventDefault();

    if (toUnix(form.end) <= toUnix(form.start)) {
      toast.error("Voting end time must be after the start time.");
      return;
    }

    if (toUnix(form.start) <= Math.floor(Date.now() / 1000)) {
      toast.error("Voting start time must be in the future.");
      return;
    }

    write(
      `Create election "${form.title}"`,
      (c) =>
        c.createElection(
          form.title.trim(),
          form.description.trim(),
          toUnix(form.start),
          toUnix(form.end)
        )
    );
  };

  const addCandidate = (e) => {
    e.preventDefault();

    write(
      `Add candidate ${candForm.name}`,
      (c) =>
        c.addCandidate(selId, candForm.name.trim(), candForm.note.trim())
    ).then((ok) => ok && setCandForm({ name: "", note: "" }));
  };

  const authorize = () => {
    const addrs = [
      ...new Set(voterText.split(/[\s,;]+/).filter(Boolean)),
    ];

    const bad = addrs.filter((a) => !isAddress(a));

    if (!addrs.length) {
      return toast.error("Paste at least one wallet address.");
    }

    if (bad.length) {
      return toast.error(`Invalid wallet address: ${shortAddr(bad[0])}`);
    }

    if (addrs.length > 100) {
      return toast.error("Authorize at most 100 wallets at a time.");
    }

    write(
      `Authorize ${addrs.length} voter wallet(s)`,
      (c) => c.authorizeVoters(selId, addrs)
    ).then((ok) => ok && setVoterText(""));
  };

  const preStart = sel && sel.state === STATE.UPCOMING && !sel.closed;
  const canClose = sel && sel.state !== STATE.ENDED;

  const pendingCount = cands.filter(
    (c) => c.status === CAND.PENDING
  ).length;

  const approvedCount = cands.filter(
    (c) => c.status === CAND.APPROVED
  ).length;

  const closeElection = () => {
    if (window.confirm("Close this election now? This cannot be undone.")) {
      write(
        `Close election #${selId}`,
        (c) => c.closeElection(selId)
      );
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">

      {/* Dashboard heading */}
      <section className="relative overflow-hidden rounded-3xl bg-indelible p-7 text-white shadow-lg sm:p-9">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border-[40px] border-white/5" />

        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
              Administration
            </span>
            <h1 className="mt-5 text-3xl font-bold sm:text-4xl">
              Admin dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
              Manage elections, approve candidates and authorize voter wallets
              through blockchain transactions.
            </p>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
            <p className="text-xs uppercase tracking-wider text-white/60">
              Administrator
            </p>
            <p className="mt-2 font-mono text-sm font-semibold">
              {shortAddr(account)}
            </p>
            <p className="mt-1 text-xs text-white/60">
              Contract owner
            </p>
          </div>
        </div>
      </section>

      {/* Overview statistics */}
      <section>
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indelible">
            Overview
          </p>
          <h2 className="mt-1 text-xl font-bold text-ink">
            Election statistics
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Total elections",
              value: elections.length,
              symbol: "▤",
            },
            {
              label: "Active elections",
              value: elections.filter((e) => e.state === STATE.ACTIVE).length,
              symbol: "◉",
            },
            {
              label: "Total candidates",
              value: elections.reduce(
                (sum, e) => sum + e.candidateCount,
                0
              ),
              symbol: "♙",
            },
            {
              label: "Total votes",
              value: elections.reduce(
                (sum, e) => sum + e.totalVotes,
                0
              ),
              symbol: "✓",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-rule bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-mute">{item.label}</p>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indelible-soft text-xl text-indelible">
                  {item.symbol}
                </span>
              </div>
              <p className="mt-5 text-3xl font-bold text-ink">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Create election */}
      <section className="rounded-3xl border border-rule bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indelible">
              Election management
            </p>
            <h2 className="mt-2 text-2xl font-bold text-ink">
              Create a new election
            </h2>
            <p className="mt-2 text-sm text-mute">
              Configure the election details and voting schedule.
            </p>
          </div>
          <span className="rounded-xl bg-indelible-soft px-3 py-2 text-xs font-semibold text-indelible">
            Owner permission required
          </span>
        </div>

        <form onSubmit={createElection} className="mt-7 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="t">Election title</label>
            <input
              id="t"
              required
              maxLength={100}
              className="field"
              placeholder="e.g. Student Council Election 2027"
              value={form.title}
              onChange={(e) =>
                setForm({ ...form, title: e.target.value })
              }
            />
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="d">Description</label>
            <textarea
              id="d"
              rows={3}
              maxLength={500}
              className="field"
              placeholder="Enter a short description of the election..."
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>

          <div>
            <label className="label" htmlFor="s">Voting opens</label>
            <input
              id="s"
              type="datetime-local"
              required
              className="field"
              value={form.start}
              onChange={(e) =>
                setForm({ ...form, start: e.target.value })
              }
            />
          </div>

          <div>
            <label className="label" htmlFor="e">Voting closes</label>
            <input
              id="e"
              type="datetime-local"
              required
              className="field"
              value={form.end}
              onChange={(e) =>
                setForm({ ...form, end: e.target.value })
              }
            />
          </div>

          <div className="sm:col-span-2">
            <button className="btn btn-primary">
              + Create election
            </button>
          </div>
        </form>
      </section>

      <TxStatus tx={tx} />

      {/* Election management */}
      {elections.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-rule bg-white p-10 text-center">
          <h2 className="text-xl font-bold text-ink">
            No elections created yet
          </h2>
          <p className="mt-2 text-sm text-mute">
            Create your first election using the form above.
          </p>
        </div>
      ) : (
        <section className="space-y-6">

          {/* Select election */}
          <div className="rounded-3xl border border-rule bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-indelible">
                  Manage
                </p>
                <h2 className="mt-1 text-xl font-bold text-ink">
                  Select an election
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  id="sel"
                  className="field !w-auto min-w-[220px]"
                  value={selId ?? ""}
                  onChange={(e) => setSelId(Number(e.target.value))}
                >
                  {elections.map((e) => (
                    <option key={e.id} value={e.id}>
                      #{e.id} {e.title}
                    </option>
                  ))}
                </select>

                {sel && <StatusBadge state={sel.state} />}
              </div>
            </div>

            {sel && (
              <div className="mt-5 flex flex-wrap gap-3 border-t border-rule pt-4">
                <Link
                  className="text-sm font-semibold text-indelible underline"
                  to={
                    sel.state === STATE.ENDED
                      ? `/results/${sel.id}`
                      : `/elections/${sel.id}`
                  }
                >
                  {sel.state === STATE.ENDED ? "View results" : "Voter view"} →
                </Link>
              </div>
            )}
          </div>

          {sel && (
            <>
              {/* Selected election statistics */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-rule bg-white p-5 shadow-sm">
                  <p className="text-sm text-mute">Candidates</p>
                  <p className="mt-2 text-3xl font-bold text-ink">
                    {sel.candidateCount}
                  </p>
                  <p className="mt-1 text-xs text-mute">
                    {approvedCount} approved
                  </p>
                </div>

                <div className="rounded-2xl border border-rule bg-white p-5 shadow-sm">
                  <p className="text-sm text-mute">Votes cast</p>
                  <p className="mt-2 text-3xl font-bold text-ink">
                    {sel.totalVotes}
                  </p>
                  <p className="mt-1 text-xs text-mute">
                    Recorded on blockchain
                  </p>
                </div>

                <div className="rounded-2xl border border-rule bg-white p-5 shadow-sm">
                  <p className="text-sm text-mute">Pending candidates</p>
                  <p className="mt-2 text-3xl font-bold text-ink">
                    {pendingCount}
                  </p>
                  <p className="mt-1 text-xs text-mute">
                    Awaiting admin review
                  </p>
                </div>
              </div>

              {/* Management cards */}
              <div className="grid items-start gap-6 lg:grid-cols-2">

                {/* Candidates */}
                <section className="rounded-3xl border border-rule bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-indelible">
                        Candidate management
                      </p>
                      <h2 className="mt-2 text-xl font-bold text-ink">
                        Candidates
                      </h2>
                    </div>
                    <span className="rounded-full bg-indelible-soft px-3 py-1 text-xs font-semibold text-indelible">
                      {cands.length} total
                    </span>
                  </div>

                  {cands.length === 0 ? (
                    <p className="mt-5 rounded-xl bg-paper p-5 text-center text-sm text-mute">
                      No candidates added yet.
                    </p>
                  ) : (
                    <ul className="mt-5 divide-y divide-rule">
                      {cands.map((c) => (
                        <li
                          key={c.id}
                          className="flex flex-wrap items-center justify-between gap-3 py-4"
                        >
                          <div>
                            <p className="font-semibold text-ink">{c.name}</p>
                            <p className="mt-1 text-xs text-mute">
                              Candidate #{c.id}
                            </p>
                            <div className="mt-2">
                              <CandidateStatusBadge status={c.status} />
                            </div>
                          </div>

                          {preStart && (
                            <div className="flex gap-2">
                              <button
                                className="btn btn-quiet !px-3 !py-2"
                                disabled={c.status === CAND.APPROVED}
                                onClick={() =>
                                  write(
                                    `Approve ${c.name}`,
                                    (k) => k.approveCandidate(selId, c.id)
                                  )
                                }
                              >
                                Approve
                              </button>

                              <button
                                className="btn btn-danger !px-3 !py-2"
                                disabled={c.status === CAND.REJECTED}
                                onClick={() =>
                                  write(
                                    `Reject ${c.name}`,
                                    (k) => k.rejectCandidate(selId, c.id)
                                  )
                                }
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {preStart ? (
                    <form
                      onSubmit={addCandidate}
                      className="mt-5 space-y-3 border-t border-rule pt-5"
                    >
                      <h3 className="font-bold text-ink">Add a candidate</h3>

                      <input
                        required
                        maxLength={100}
                        className="field"
                        placeholder="Candidate name"
                        aria-label="Candidate name"
                        value={candForm.name}
                        onChange={(e) =>
                          setCandForm({
                            ...candForm,
                            name: e.target.value,
                          })
                        }
                      />

                      <input
                        className="field"
                        maxLength={200}
                        placeholder="Short candidate note (optional)"
                        aria-label="Candidate note"
                        value={candForm.note}
                        onChange={(e) =>
                          setCandForm({
                            ...candForm,
                            note: e.target.value,
                          })
                        }
                      />

                      <button className="btn btn-primary w-full">
                        + Add candidate
                      </button>
                    </form>
                  ) : (
                    <p className="mt-5 rounded-xl bg-paper p-4 text-xs leading-5 text-mute">
                      Candidates can only be changed before voting opens.
                    </p>
                  )}
                </section>

                {/* Voter management */}
                <section className="rounded-3xl border border-rule bg-white p-6 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wider text-indelible">
                    Voter management
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-ink">
                    Authorize wallets
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-mute">
                    Add wallet addresses that are allowed to participate in
                    this election. Separate multiple addresses using commas,
                    spaces or new lines.
                  </p>

                  <textarea
                    rows={7}
                    className="field mt-5 font-mono text-xs"
                    value={voterText}
                    onChange={(e) => setVoterText(e.target.value)}
                    placeholder={"0x70997970C51812dc3A010C7d01b50e0d17dc79C8"}
                    aria-label="Voter wallet addresses"
                    disabled={sel.state === STATE.ENDED}
                  />

                  <button
                    className="btn btn-primary mt-4 w-full"
                    onClick={authorize}
                    disabled={sel.state === STATE.ENDED}
                  >
                    Authorize voter wallets
                  </button>

                  <div className="mt-5 rounded-xl bg-indelible-soft p-4">
                    <p className="text-sm font-semibold text-indelible">
                      Important
                    </p>
                    <p className="mt-1 text-xs leading-5 text-indelible/80">
                      Only authorized wallets can cast a vote. The
                      authorization is recorded through an owner-signed
                      blockchain transaction.
                    </p>
                  </div>

                  {canClose && (
                    <div className="mt-6 border-t border-rule pt-5">
                      <h3 className="font-bold text-ink">Close election</h3>
                      <p className="mt-2 text-xs leading-5 text-mute">
                        Closing the election immediately ends voting and
                        publishes the results. This action cannot be undone.
                      </p>
                      <button
                        className="btn btn-danger mt-3 w-full"
                        onClick={closeElection}
                      >
                        Close this election
                      </button>
                    </div>
                  )}
                </section>
              </div>

              {/* Blockchain activity */}
              <section className="overflow-hidden rounded-3xl border border-rule bg-white shadow-sm">
                <div className="p-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-indelible">
                    Transparency
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-ink">
                    Blockchain activity
                  </h2>
                  <p className="mt-2 text-sm text-mute">
                    Recent smart contract events for this election.
                  </p>
                </div>

                {activity.length === 0 ? (
                  <p className="border-t border-rule p-6 text-sm text-mute">
                    No blockchain events found for this election yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[550px] text-left text-sm">
                      <thead className="bg-paper text-xs uppercase tracking-wider text-mute">
                        <tr>
                          <th className="px-6 py-4 font-semibold">Block</th>
                          <th className="px-6 py-4 font-semibold">Event</th>
                          <th className="px-6 py-4 font-semibold">Transaction</th>
                          <th className="px-6 py-4 font-semibold">Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {activity.map((l, i) => (
                          <tr
                            key={i}
                            className="border-t border-rule transition hover:bg-paper/70"
                          >
                            <td className="px-6 py-4 font-mono text-xs text-mute">
                              {l.blockNumber}
                            </td>

                            <td className="px-6 py-4 font-medium text-ink">
                              {l.eventName}
                              {l.eventName === "VoterRegistered" ||
                              l.eventName === "VoteCast"
                                ? ` (${shortAddr(l.args[1])})`
                                : ""}
                            </td>

                            <td className="px-6 py-4 font-mono text-xs text-indelible">
                              {shortHash(l.transactionHash)}
                            </td>

                            <td className="px-6 py-4">
                              <Link
                                className="font-semibold text-indelible underline"
                                to={`/verify/${l.transactionHash}`}
                              >
                                Verify →
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </section>
      )}
    </div>
  );
}
