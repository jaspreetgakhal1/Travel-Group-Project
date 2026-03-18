// Added by Codex: project documentation comment for src\components\TripPost.tsx
import { useEffect, useMemo, useState } from 'react';
import type { FeedPost } from '../types/feed';
import type { TripDNAMatch } from '../services/matchApi';
import DNAOverlayChart from './travel-dna/DNAOverlayChart';

type TripPostProps = {
  post: FeedPost;
  currentUserId?: string | null;
  canManagePost: boolean;
  pendingRequestCount: number;
  isRequestSent: boolean;
  isActionInProgress: boolean;
  dnaMatch?: TripDNAMatch;
  isDNAMatchLoading: boolean;
  onJoinRequest: (post: FeedPost) => void;
  onOpenTripChat?: (tripId: string) => void;
  onManageRequests: (post: FeedPost) => void;
  onShare: (post: FeedPost) => void;
  onDismiss: (postId: string) => void;
  onEditPost: (post: FeedPost) => void;
  onDeletePost: (post: FeedPost) => void;
  onCompletePost: (post: FeedPost) => void;
};

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function TripPost({
  post,
  currentUserId = null,
  canManagePost,
  pendingRequestCount,
  isRequestSent,
  isActionInProgress,
  dnaMatch,
  isDNAMatchLoading,
  onJoinRequest,
  onOpenTripChat,
  onManageRequests,
  onShare,
  onDismiss,
  onEditPost,
  onDeletePost,
  onCompletePost,
}: TripPostProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [animatedMatchScore, setAnimatedMatchScore] = useState(0);

  const matchPercentage = dnaMatch?.matchPercentage ?? null;
  const isPerfectVibe = typeof matchPercentage === 'number' && matchPercentage > 85;
  const isVibeWarning = typeof matchPercentage === 'number' && matchPercentage < 50;
  const maxParticipants = post.maxParticipants > 0 ? post.maxParticipants : post.requiredPeople;
  const spotsFilled = Math.max(0, Math.min(post.spotsFilled, maxParticipants));
  const isTripFull = spotsFilled >= maxParticipants;
  const isJoinedTrip = Boolean(currentUserId && post.participantIds.includes(currentUserId));
  const hasAcceptedParticipants = post.participantIds.length > 0;

  const formattedDates = useMemo(
    () => ({
      start: dateFormatter.format(new Date(post.startDate)),
      end: dateFormatter.format(new Date(post.endDate)),
    }),
    [post.endDate, post.startDate],
  );

  const handleCardToggle = () => {
    setIsExpanded((previous) => !previous);
  };

  useEffect(() => {
    if (!isExpanded || typeof matchPercentage !== 'number') {
      return;
    }

    let frameId = 0;
    let start = 0;
    const durationMs = 640;

    const animate = (timestamp: number) => {
      if (!start) {
        start = timestamp;
      }

      const elapsed = timestamp - start;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      setAnimatedMatchScore(Math.round(matchPercentage * eased));

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    setAnimatedMatchScore(0);
    frameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameId);
  }, [isExpanded, matchPercentage, post.id]);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={handleCardToggle}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleCardToggle();
        }
      }}
      className="rounded-card border border-primary/10 bg-white/95 p-4 text-left shadow-lg outline-none transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-accent/40 sm:p-5"
      aria-expanded={isExpanded}
    >
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-bold uppercase text-background">
          {post.hostProfileImageDataUrl ? (
            <img
              src={post.hostProfileImageDataUrl}
              alt={`${post.hostName} profile`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            (post.hostName.charAt(0) || '?').toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-bold text-primary">{post.hostName}</p>
            {post.isVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/25 px-2 py-0.5 text-[11px] font-semibold text-primary">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-success text-[10px] text-white">
                  V
                </span>
                Verified
              </span>
            ) : (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary/80">
                Pending
              </span>
            )}
            {post.onlyVerifiedUsers ? (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                Verified users only
              </span>
            ) : null}
            {isDNAMatchLoading ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary/80">
                DNA syncing...
              </span>
            ) : typeof matchPercentage === 'number' ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary/90">
                DNA {matchPercentage}%
              </span>
            ) : (
              <span className="rounded-full bg-primary/5 px-2 py-0.5 text-[11px] font-semibold text-primary/60">
                DNA unavailable
              </span>
            )}
            {isPerfectVibe ? (
              <span className="rounded-full bg-[#81B29A]/20 px-2 py-0.5 text-[11px] font-semibold text-[#2F6A5A]">
                Perfect Vibe
              </span>
            ) : null}
            {isVibeWarning ? (
              <span className="rounded-full bg-[#E07A5F]/20 px-2 py-0.5 text-[11px] font-semibold text-[#8C4633]">
                Vibe Warning
              </span>
            ) : null}
            {canManagePost ? (
              <span className="rounded-full bg-[#E07A5F]/15 px-2 py-0.5 text-[11px] font-semibold text-[#8C4633]">
                {pendingRequestCount} Pending Requests
              </span>
            ) : null}
            {isTripFull ? (
              <span className="rounded-full bg-[#E07A5F]/20 px-2 py-0.5 text-[11px] font-semibold text-[#8C4633]">
                Trip Full
              </span>
            ) : null}
          </div>
          <p className="truncate text-xs text-primary/70">{post.title}</p>
        </div>
        {canManagePost ? (
          <div className="relative ml-auto">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={isOptionsOpen}
              onClick={(event) => {
                event.stopPropagation();
                setIsOptionsOpen((previous) => !previous);
              }}
              className="interactive-btn rounded-card border border-primary/15 bg-white px-2.5 py-1.5 text-sm font-bold text-primary"
            >
              ...
            </button>
            {isOptionsOpen ? (
              <div
                role="menu"
                className="absolute right-0 z-20 mt-2 w-40 rounded-card border border-primary/15 bg-white p-1.5 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  disabled={isActionInProgress}
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsOptionsOpen(false);
                    onEditPost(post);
                  }}
                  className="interactive-btn w-full rounded-card px-3 py-2 text-left text-xs font-semibold text-primary hover:bg-background/80 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Edit Post
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={isActionInProgress}
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsOptionsOpen(false);
                    onDeletePost(post);
                  }}
                  className="interactive-btn w-full rounded-card px-3 py-2 text-left text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Delete Post
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={isActionInProgress || post.status === 'Completed'}
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsOptionsOpen(false);
                    onCompletePost(post);
                  }}
                  className="interactive-btn w-full rounded-card px-3 py-2 text-left text-xs font-semibold text-primary hover:bg-background/80 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {post.status === 'Completed' ? 'Already Completed' : 'Complete Post'}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </header>

      <div className="mt-4 overflow-hidden rounded-card border border-primary/10">
        <img src={post.imageUrl} alt={post.title} className="h-56 w-full object-cover sm:h-64" loading="lazy" />
      </div>

      <section className="mt-4 rounded-card bg-background/80 p-3 ring-1 ring-primary/10">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Spots Filled</p>
          <p className="text-sm font-bold text-primary">
            {spotsFilled}/{maxParticipants} ({post.spotsFilledPercent}%)
          </p>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-primary/15">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${post.spotsFilledPercent}%` }}
          />
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-card border border-primary/10 bg-background/75 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/70">Location</p>
          <p className="mt-1 text-sm font-semibold text-primary">{post.location}</p>
        </div>
        <div className="rounded-card border border-primary/10 bg-background/75 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/70">Cost</p>
          <p className="mt-1 text-sm font-semibold text-primary">${post.cost.toFixed(0)}</p>
        </div>
        <div className="rounded-card border border-primary/10 bg-background/75 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/70">Duration</p>
          <p className="mt-1 text-sm font-semibold text-primary">{post.durationDays} Days</p>
        </div>
        <div className="rounded-card border border-primary/10 bg-background/75 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/70">Required People</p>
          <p className="mt-1 text-sm font-semibold text-primary">{post.requiredPeople}</p>
        </div>
      </section>

      <div className={`grid transition-all duration-300 ${isExpanded ? 'mt-4 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <section className="rounded-card border border-primary/10 bg-white/80 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Expectations</p>
            <ul className="mt-2 space-y-1 text-sm text-primary/85">
              {post.expectations.slice(0, 3).map((expectation) => (
                <li key={expectation}>- {expectation}</li>
              ))}
            </ul>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <div className="rounded-card bg-background/75 p-2 ring-1 ring-primary/10">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/70">Traveler Type</p>
                <p className="mt-1 font-semibold text-primary">{post.travelerType}</p>
              </div>
              <div className="rounded-card bg-background/75 p-2 ring-1 ring-primary/10">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/70">Start Date</p>
                <p className="mt-1 font-semibold text-primary">{formattedDates.start}</p>
              </div>
              <div className="rounded-card bg-background/75 p-2 ring-1 ring-primary/10">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/70">End Date</p>
                <p className="mt-1 font-semibold text-primary">{formattedDates.end}</p>
              </div>
            </div>
          </section>

          <section className="mt-3 rounded-card border border-primary/10 bg-white/90 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">DNA Compatibility</p>
              <p className="text-base font-black text-primary">
                {isDNAMatchLoading
                  ? '...'
                  : typeof matchPercentage === 'number'
                    ? `${isExpanded ? animatedMatchScore : matchPercentage}%`
                    : 'N/A'}
              </p>
            </div>

            {isPerfectVibe ? (
              <p className="mt-2 rounded-card bg-[#81B29A]/15 px-2 py-1 text-xs font-semibold text-[#2F6A5A]">
                Perfect Vibe: high compatibility for shared planning and trip rhythm.
              </p>
            ) : null}

            {isVibeWarning ? (
              <p className="mt-2 rounded-card bg-[#E07A5F]/15 px-2 py-1 text-xs font-semibold text-[#8C4633]">
                Vibe Warning: {dnaMatch?.conflictHint ?? 'Major travel-style differences detected.'}
              </p>
            ) : null}

            {dnaMatch ? (
              <DNAOverlayChart
                userDNA={dnaMatch.viewerDNA}
                organizerDNA={dnaMatch.organizerDNA}
                className="mt-3"
              />
            ) : (
              <p className="mt-3 text-xs text-primary/65">
                Sign in and complete Travel DNA to unlock organizer compatibility visuals.
              </p>
            )}
          </section>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-primary/10 pt-4">
        {canManagePost ? (
          <>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onManageRequests(post);
              }}
              className="interactive-btn rounded-card border border-[#E07A5F]/35 bg-[#E07A5F]/15 px-3 py-2 text-xs font-semibold text-[#8C4633]"
            >
              Manage Requests ({pendingRequestCount})
            </button>
            {hasAcceptedParticipants ? (
              <div className="group relative">
                <button
                  type="button"
                  aria-label="Join Trip Discussion"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenTripChat?.(post.id);
                  }}
                  className="interactive-btn rounded-card border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary"
                >
                  Chat
                </button>
                <span className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-primary px-2 py-1 text-[10px] font-semibold text-white opacity-0 shadow transition-opacity duration-150 group-hover:opacity-100">
                  Join Trip Discussion
                </span>
              </div>
            ) : null}
          </>
        ) : (
          <>
            {isJoinedTrip ? (
              <>
                <span className="rounded-card border border-success/40 bg-success/20 px-3 py-2 text-xs font-semibold text-primary">
                  Joined Trip
                </span>
                <div className="group relative">
                  <button
                    type="button"
                    aria-label="Join Trip Discussion"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenTripChat?.(post.id);
                    }}
                    className="interactive-btn rounded-card border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary"
                  >
                    Chat
                  </button>
                  <span className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-primary px-2 py-1 text-[10px] font-semibold text-white opacity-0 shadow transition-opacity duration-150 group-hover:opacity-100">
                    Join Trip Discussion
                  </span>
                </div>
              </>
            ) : isTripFull ? (
              <span className="rounded-card border border-[#E07A5F]/35 bg-[#F4F1DE] px-3 py-2 text-xs font-semibold text-[#8C4633]">
                Trip Full
              </span>
            ) : (
              <button
                type="button"
                disabled={isRequestSent || isActionInProgress}
                onClick={(event) => {
                  event.stopPropagation();
                  onJoinRequest(post);
                }}
                className={
                  isRequestSent || isActionInProgress
                    ? 'rounded-card border border-success/40 bg-success/25 px-3 py-2 text-xs font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-70'
                    : 'interactive-btn rounded-card bg-primary px-3 py-2 text-xs font-semibold text-background'
                }
              >
                {isRequestSent ? 'Request Sent' : isActionInProgress ? 'Sending...' : 'Join Request'}
              </button>
            )}
          </>
        )}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onShare(post);
          }}
          className="interactive-btn rounded-card border border-primary/20 bg-white px-3 py-2 text-xs font-semibold text-primary"
        >
          Share
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDismiss(post.id);
          }}
          className="interactive-btn ml-auto rounded-card border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
        >
          Dismiss
        </button>
      </div>
    </article>
  );
}

export default TripPost;

