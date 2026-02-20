import { useMemo, useState } from 'react';
import type { FeedPost } from '../types/feed';

type TripPostProps = {
  post: FeedPost;
  isRequestSent: boolean;
  onJoinRequest: (post: FeedPost) => void;
  onShare: (post: FeedPost) => void;
  onDismiss: (postId: string) => void;
};

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function TripPost({ post, isRequestSent, onJoinRequest, onShare, onDismiss }: TripPostProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-bold uppercase text-background">
          {post.hostName.charAt(0)}
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
          </div>
          <p className="truncate text-xs text-primary/70">{post.title}</p>
        </div>
      </header>

      <div className="mt-4 overflow-hidden rounded-card border border-primary/10">
        <img src={post.imageUrl} alt={post.title} className="h-56 w-full object-cover sm:h-64" loading="lazy" />
      </div>

      <section className="mt-4 rounded-card bg-background/80 p-3 ring-1 ring-primary/10">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Spots Filled</p>
          <p className="text-sm font-bold text-primary">{post.spotsFilledPercent}%</p>
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
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-primary/10 pt-4">
        <button
          type="button"
          disabled={isRequestSent}
          onClick={(event) => {
            event.stopPropagation();
            onJoinRequest(post);
          }}
          className={
            isRequestSent
              ? 'rounded-card border border-success/40 bg-success/25 px-3 py-2 text-xs font-semibold text-primary'
              : 'interactive-btn rounded-card bg-primary px-3 py-2 text-xs font-semibold text-background'
          }
        >
          {isRequestSent ? 'Request Sent' : 'Join Request'}
        </button>
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
