
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchCandidates,
  fetchElection,
  getReadContract,
  getWriteContract,
} from "../lib/contract";
import { CAND, STATE, errorMessage, fmtDate } from "../lib/format";
import { Modal, Spinner, StatusBadge, TxStatus } from "../components/ui";
import { useWallet } from "../context/WalletContext";
import { useTx } from "../lib/useTx";

export default function ElectionDetail() {
  const { id } = useParams();
  const { account, connect, onRightChain, switchChain } = useWallet();

  const [election, setElection] = useState(null);
  const [cands, setCands] = useState([]);
  const [elig, setElig] = useState({ authorized: false, voted: false });
  const [selected, setSelected] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  const { tx, run } = useTx();

  const load = useCallback(async () => {
    try {
      const e = await fetchElection(id);
      setElection(e);

      const candidates = await fetchCandidates(id, e.candidateCount);
      setCands(candidates.filter((c) => c.status === CAND.APPROVED));

      if (account) {
        const contract = getReadContract();

        const [authorized, voted] = await Promise.all([
          contract.isAuthorized(id, account),
          contract.hasAddressVoted(id, account),
        ]);

        setElig({ authorized, voted });
      } else {
        setElig({ authorized: false, voted: false });
      }

      setError("");
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [id, account]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [load]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl rounded-3xl border border-bad/20 bg-bad-soft p-8 text-center">
        <div className="text-3xl">!</div>
        <h2 className="mt-3 text-xl font-bold text-ink">
          Unable to load election
        </h2>
        <p className="mt-2 text-sm text-mute">{error}</p>
        <button className="btn btn-primary mt-5" onClick={load}>
          Try again
        </button>
      </div>
    );
  }

  if (!election) {
    return <Spinner label="Loading election from the blockchain" />;
  }

  const active = election.state === STATE.ACTIVE;
  const upcoming = election.state === STATE.UPCOMING;
  const ended = election.state === STATE.ENDED;

  const chosen = cands.find((c) => c.id === selected);

  const canVote =
    active &&
    account &&
    onRightChain &&
    elig.authorized &&
    !elig.voted;
  console.table({
  electionActive: active,
  connectedAccount: account,
  correctNetwork: onRightChain,
  voterAuthorized: elig.authorized,
  alreadyVoted: elig.voted,
  });
  let notice = "";

  if (upcoming) {
    notice = `Voting opens ${fmtDate(election.startTime)}.`;
  } else if (ended) {
    notice = "This election has ended. You can now view the final results.";
  } else if (!account) {
    notice = "Connect your wallet to check your voting eligibility.";
  } else if (!onRightChain) {
    notice = "Switch MetaMask to the Hardhat Local network.";
  } else if (elig.voted) {
    notice = "Your vote has already been recorded on the blockchain.";
  } else if (!elig.authorized) {
    notice = "Your wallet is not authorized for this election. Contact the administrator.";
  } else {
    notice = "Your wallet is eligible. Select a candidate to cast your vote.";
  }

  const castVote = async () => {
    if (!chosen) return;

    setConfirming(false);

    await run(
      `Vote for ${chosen.name}`,
      async () => (await getWriteContract()).castVote(id, selected),
      load
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-7">

      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-mute">
        <Link to="/" className="transition hover:text-indelible">
          Home
        </Link>
        <span>/</span>
        <Link to="/elections" className="transition hover:text-indelible">
          Elections
        </Link>
        <span>/</span>
        <span className="font-medium text-ink">Election details</span>
      </div>

      {/* Election header */}
      <section className="relative overflow-hidden rounded-3xl bg-indelible p-7 text-white shadow-lg sm:p-10">
        <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full border-[45px] border-white/5" />
        <div className="pointer-events-none absolute -bottom-32 right-32 h-64 w-64 rounded-full bg-white/5" />

        <div className="relative">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/80">
              Election #{id}
            </span>
            <StatusBadge state={election.state} />
          </div>

          <h1 className="mt-6 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
            {election.title}
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
            {election.description}
          </p>

          <div className="mt-8 grid gap-4 border-t border-white/15 pt-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-white/55">
                Voting starts
              </p>
              <p className="mt-2 text-sm font-semibold">
                {fmtDate(election.startTime)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-white/55">
                Voting ends
              </p>
              <p className="mt-2 text-sm font-semibold">
                {fmtDate(election.endTime)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <div className="grid items-start gap-7 lg:grid-cols-[1fr_350px]">

        {/* Candidate section */}
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-indelible">
                Ballot
              </p>
              <h2 className="mt-2 text-2xl font-bold text-ink">
                Choose your candidate
              </h2>
              <p className="mt-2 text-sm text-mute">
                Select one candidate from the approved list below.
              </p>
            </div>

            <span className="rounded-full bg-indelible-soft px-4 py-2 text-xs font-semibold text-indelible">
              {cands.length} approved candidates
            </span>
          </div>

          {cands.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-rule bg-white p-10 text-center">
              <div className="text-4xl">◎</div>
              <h3 className="mt-4 font-bold text-ink">
                No approved candidates yet
              </h3>
              <p className="mt-2 text-sm text-mute">
                Candidates will appear here once the administrator approves them.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {cands.map((candidate, index) => {
                const isSelected = selected === candidate.id;

                return (
                  <button
                    key={candidate.id}
                    type="button"
                    disabled={!canVote}
                    aria-pressed={isSelected}
                    onClick={() => setSelected(candidate.id)}
                    className={`group relative rounded-2xl border p-5 text-left transition duration-200 ${
                      isSelected
                        ? "border-indelible bg-indelible-soft shadow-md ring-2 ring-indelible/10"
                        : "border-rule bg-white hover:border-indelible/50 hover:shadow-md"
                    } disabled:cursor-default disabled:hover:border-rule disabled:hover:shadow-none`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indelible-soft text-lg font-bold text-indelible">
                        {String(index + 1).padStart(2, "0")}
                      </div>

                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                          isSelected
                            ? "border-indelible bg-indelible text-white"
                            : "border-rule"
                        }`}
                      >
                        {isSelected && (
                          <span className="text-xs">✓</span>
                        )}
                      </div>
                    </div>

                    <h3 className="mt-5 text-lg font-bold text-ink">
                      {candidate.name}
                    </h3>

                    <p className="mt-2 text-xs text-mute">
                      Candidate #{candidate.id}
                    </p>

                    {candidate.metadataURI && (
                      <p className="mt-3 break-all text-xs leading-5 text-mute">
                        {candidate.metadataURI}
                      </p>
                    )}

                    <div className="mt-5 flex items-center justify-between border-t border-rule/70 pt-4">
                      <span className="text-xs font-medium text-mute">
                        Approved candidate
                      </span>
                      <span className="text-xs font-semibold text-indelible">
                        {isSelected ? "Selected" : "Select candidate"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Voting reminder */}
          <div className="rounded-2xl border border-rule bg-white p-5">
            <div className="flex items-start gap-3">
              <span className="text-xl text-indelible">ⓘ</span>
              <div>
                <h3 className="font-semibold text-ink">
                  Before you cast your vote
                </h3>
                <p className="mt-1 text-sm leading-6 text-mute">
                  Please review your selection carefully. Once confirmed
                  through MetaMask and recorded on the blockchain, your vote
                  cannot be changed or withdrawn.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Voting sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-6">
          <div className="rounded-3xl border border-rule bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indelible">
              Voting panel
            </p>

            <h2 className="mt-2 text-xl font-bold text-ink">
              Your participation
            </h2>

            <div className="mt-5 rounded-2xl bg-paper p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-mute">
                Current selection
              </p>
              <p className="mt-2 font-bold text-ink">
                {chosen ? chosen.name : "No candidate selected"}
              </p>
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rule p-4">
              <span className="mt-0.5 text-lg">◈</span>
              <div>
                <p className="text-sm font-semibold text-ink">
                  Eligibility status
                </p>
                <p className="mt-1 text-xs leading-5 text-mute">
                  {notice}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {!account && active && (
                <button
                  className="btn btn-primary w-full"
                  onClick={connect}
                >
                  Connect MetaMask
                </button>
              )}

              {account && !onRightChain && (
                <button
                  className="btn btn-primary w-full"
                  onClick={switchChain}
                >
                  Switch network
                </button>
              )}

              {canVote && (
                <button
                  className="btn btn-primary w-full"
                  disabled={!selected}
                  onClick={() => setConfirming(true)}
                >
                  {selected ? "Review and vote →" : "Select a candidate"}
                </button>
              )}

              {ended && (
                <Link
                  className="btn btn-primary block w-full text-center"
                  to={`/results/${id}`}
                >
                  View election results →
                </Link>
              )}

              {upcoming && (
                <div className="rounded-xl bg-paper p-3 text-center text-xs font-medium text-mute">
                  Voting has not started yet.
                </div>
              )}

              {active && account && elig.voted && (
                <div className="rounded-xl bg-indelible-soft p-3 text-center text-sm font-semibold text-indelible">
                  ✓ Vote already recorded
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-indelible-soft p-5">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔒</span>
              <h3 className="font-bold text-indelible">
                Blockchain secured
              </h3>
            </div>
            <p className="mt-2 text-xs leading-6 text-indelible/80">
              Your vote is submitted as a blockchain transaction and protected
              by the smart contract's voting rules.
            </p>
          </div>

          <TxStatus tx={tx} />
        </aside>
      </div>

      {/* Confirmation modal */}
      {confirming && chosen && (
        <Modal
          title="Confirm your vote"
          onClose={() => setConfirming(false)}
        >
          <div className="space-y-4">
            <div className="rounded-2xl bg-paper p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-mute">
                Your selected candidate
              </p>
              <p className="mt-2 text-lg font-bold text-ink">
                {chosen.name}
              </p>
              <p className="mt-1 text-sm text-mute">
                {election.title}
              </p>
            </div>

            <div className="rounded-2xl bg-warn-soft p-4 text-sm leading-6 text-warn">
              Important: Your vote cannot be changed or withdrawn after
              confirmation. Review your selection before submitting it
              through MetaMask.
            </div>

            <div className="flex flex-wrap justify-end gap-3 pt-2">
              <button
                className="btn btn-quiet"
                onClick={() => setConfirming(false)}
              >
                Go back
              </button>

              <button
                className="btn btn-primary"
                onClick={castVote}
              >
                Confirm and submit
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
