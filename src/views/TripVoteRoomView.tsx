import { motion } from 'framer-motion';
import { ArrowLeft, BadgeCheck, CheckCircle2, Clock3, Lock, MapPin, Users } from 'lucide-react';
import type { TripVoteSession } from '../services/tripVoteApi';

type TripVoteRoomViewProps = {
  session: TripVoteSession | null;
  error: string;
  isLoading: boolean;
  isSubmittingVote: boolean;
  isClosingVote: boolean;
  onBack: () => void;
  onVote: () => void;
  onCloseVote: () => void;
};

const getInitials = (name: string): string => {
  const tokens = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!tokens.length) {
    return 'TR';
  }

  return tokens
    .slice(0, 2)
    .map((token) => token.charAt(0).toUpperCase())
    .join('');
};

function TripVoteRoomView({
  session,
  error,
  isLoading,
  isSubmittingVote,
  isClosingVote,
  onBack,
  onVote,
  onCloseVote,
}: TripVoteRoomViewProps) {
  const heroImageUrl = session?.imageUrl || session?.trip.imageUrl || '';
  const decisionLabel =
    session?.decisionMode === 'host_closed'
      ? 'Host closed the room'
      : session?.status === 'decided'
        ? 'Majority reached'
        : 'Voting is live';

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <div className="overflow-hidden rounded-[38px] border border-white/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(249,245,236,0.92))] shadow-[0_42px_120px_-52px_rgba(15,23,42,0.72)] backdrop-blur-2xl">
        <div className="border-b border-primary/10 bg-white/55 px-5 py-5 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/48">Voting Room</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-primary sm:text-4xl">
                {session?.placeName ?? 'Group destination vote'}
              </h1>
              <p className="mt-2 text-sm text-primary/68">
                {session ? `${session.trip.title} in ${session.trip.location}` : 'Loading your shared destination vote.'}
              </p>
            </div>

            <button
              type="button"
              onClick={onBack}
              className="interactive-btn inline-flex items-center justify-center gap-2 rounded-[22px] bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>
        </div>

        <div className="space-y-6 px-5 py-6 sm:px-8 sm:py-8">
          {error ? (
            <p className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>
          ) : null}

          {isLoading && !session ? (
            <div className="rounded-[30px] border border-white/20 bg-white/72 p-6 text-sm text-primary/68 shadow-xl shadow-slate-950/8">
              Loading live voting room details...
            </div>
          ) : null}

          {session ? (
            <>
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
                <article className="overflow-hidden rounded-[34px] border border-white/20 bg-white/78 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.34)]">
                  <div className="relative aspect-square overflow-hidden">
                    {heroImageUrl ? (
                      <img src={heroImageUrl} alt={session.placeName} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="h-full w-full bg-[radial-gradient(circle_at_top,rgba(129,178,154,0.35),transparent_42%),linear-gradient(135deg,rgba(61,64,91,0.92),rgba(224,122,95,0.75))]" />
                    )}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02),rgba(15,23,42,0.72))]" />

                    <div className="absolute inset-x-0 bottom-0 space-y-3 px-5 pb-5 sm:px-6 sm:pb-6">
                      <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
                        <span className="rounded-full bg-white/18 px-3 py-1 backdrop-blur-md">{decisionLabel}</span>
                        <span className="rounded-full bg-white/18 px-3 py-1 backdrop-blur-md">
                          {session.votedCount} of {session.totalMembers} voted
                        </span>
                      </div>
                      <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">{session.placeName}</h2>
                    </div>
                  </div>

                  <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
                    <p className="text-sm leading-7 text-primary/72">{session.description}</p>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-[24px] bg-primary/6 px-4 py-4 text-primary">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/48">Estimated Cost</p>
                        <p className="mt-2 text-2xl font-black">${session.estimatedCost.toFixed(2)}</p>
                      </div>
                      <div className="rounded-[24px] bg-white px-4 py-4 text-primary shadow-lg shadow-slate-950/8 ring-1 ring-primary/10">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/48">Majority Needed</p>
                        <p className="mt-2 text-2xl font-black">{session.requiredVotes}</p>
                      </div>
                      <div className="rounded-[24px] bg-success/12 px-4 py-4 text-primary">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/48">Trip</p>
                        <p className="mt-2 text-base font-black leading-snug">{session.trip.title}</p>
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-white/20 bg-[linear-gradient(180deg,rgba(244,241,222,0.7),rgba(255,255,255,0.94))] px-5 py-5 shadow-inner shadow-white/35">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/48">Vote Summary</p>
                          <h3 className="mt-2 text-2xl font-black text-primary">
                            {session.votedCount} out of {session.totalMembers} members have voted
                          </h3>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-primary shadow-md shadow-slate-950/8">
                          <Users className="h-4 w-4" />
                          Live room
                        </div>
                      </div>

                      <div className="mt-4 h-4 overflow-hidden rounded-full bg-primary/8">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(0, Math.min(100, (session.votedCount / session.totalMembers) * 100))}%` }}
                          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                          className={`h-full rounded-full ${
                            session.status === 'decided'
                              ? 'bg-[linear-gradient(90deg,rgba(129,178,154,1),rgba(184,225,206,0.95))]'
                              : 'bg-[linear-gradient(90deg,rgba(61,64,91,0.96),rgba(224,122,95,0.86))]'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </article>

                <article className="rounded-[34px] border border-white/20 bg-white/82 p-5 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.34)] sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/48">Shared Status</p>
                      <h3 className="mt-2 text-2xl font-black text-primary">Who voted</h3>
                    </div>
                    <div className="rounded-full bg-primary/6 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/58">
                      {session.status}
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {session.members.map((member) => (
                      <div
                        key={member.id}
                        className={`flex items-center justify-between gap-3 rounded-[24px] border px-4 py-3 shadow-sm ${
                          member.hasVoted
                            ? 'border-success/25 bg-success/10'
                            : 'border-primary/10 bg-white'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/12 text-sm font-bold text-primary">
                            {member.avatar ? (
                              <img src={member.avatar} alt={member.name} className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                              getInitials(member.name)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-primary">{member.name}</p>
                            <p className="mt-0.5 text-xs text-primary/55">
                              {member.isHost ? 'Host' : 'Traveler'}
                              {member.hasVoted ? ' • Vote submitted' : ' • Waiting'}
                            </p>
                          </div>
                        </div>

                        {member.hasVoted ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-success px-3 py-1.5 text-xs font-semibold text-white">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Voted
                          </span>
                        ) : (
                          <span className="text-lg" aria-label="Waiting for vote">
                            ⏳
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 space-y-3 rounded-[28px] border border-white/20 bg-[linear-gradient(180deg,rgba(247,246,242,0.92),rgba(255,255,255,0.98))] p-4 shadow-inner shadow-white/35">
                    <div className="flex items-start gap-3">
                      {session.status === 'decided' ? (
                        <BadgeCheck className="mt-0.5 h-5 w-5 text-success" />
                      ) : (
                        <Clock3 className="mt-0.5 h-5 w-5 text-primary/70" />
                      )}
                      <div>
                        <p className="text-sm font-semibold text-primary">
                          {session.status === 'decided'
                            ? `${session.placeName} is the selected destination.`
                            : `Voting stays open until ${session.requiredVotes} travelers vote or the host closes the room.`}
                        </p>
                        {session.decisionMadeAt ? (
                          <p className="mt-1 text-xs text-primary/55">
                            Decision recorded {new Date(session.decisionMadeAt).toLocaleString()}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={onVote}
                        disabled={session.status !== 'open' || session.hasViewerVoted || isSubmittingVote}
                        className="interactive-btn inline-flex items-center justify-center gap-2 rounded-[22px] bg-[linear-gradient(145deg,rgba(61,64,91,1),rgba(73,78,121,0.96))] px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {isSubmittingVote ? 'Submitting Vote...' : session.hasViewerVoted ? 'You Already Voted' : 'Vote For This Place'}
                      </button>

                      {session.isViewerHost ? (
                        <button
                          type="button"
                          onClick={onCloseVote}
                          disabled={session.status !== 'open' || isClosingVote}
                          className="interactive-btn inline-flex items-center justify-center gap-2 rounded-[22px] border border-primary/12 bg-white px-5 py-3 text-sm font-semibold text-primary shadow-lg shadow-slate-950/8 disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          <Lock className="h-4 w-4" />
                          {isClosingVote ? 'Closing Vote...' : 'Close and Decide'}
                        </button>
                      ) : null}

                      <div className="inline-flex items-center gap-2 text-xs font-medium text-primary/58">
                        <MapPin className="h-3.5 w-3.5" />
                        {session.trip.location}
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default TripVoteRoomView;
