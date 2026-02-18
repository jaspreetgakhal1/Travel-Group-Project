import React from 'react';
import type { Trip } from '../models/tripModel';

type TripCardViewProps = {
  trip: Trip;
  matchScore: number;
  onViewMore: (tripId: string) => void;
  onJoinChat: (tripId: string) => void;
};

const TripCardView: React.FC<TripCardViewProps> = ({ trip, matchScore, onViewMore, onJoinChat }) => {
  const canJoinChat = matchScore > 70;

  return (
    <article className="overflow-hidden rounded-card bg-white/95 shadow-lg ring-1 ring-primary/10 backdrop-blur-sm">
      <div className="relative h-52 w-full overflow-hidden">
        <img src={trip.imageUrl} alt={trip.title} className="h-full w-full object-cover" loading="lazy" />
        <span className="absolute right-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
          {matchScore}% Match
        </span>
      </div>

      <div className="space-y-3 p-5 text-primary">
        <h3 className="text-lg font-semibold leading-snug">{trip.title}</h3>

        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Host: {trip.hostName}</span>
          {trip.isVerified ? (
            <span className="rounded-full bg-success/20 px-2 py-0.5 text-xs font-semibold text-primary ring-1 ring-success/40">
              Verified
            </span>
          ) : null}
        </div>

        <p className="text-sm text-primary/80">
          Price per share: <span className="text-base font-bold text-primary">${trip.priceShare}</span>
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onViewMore(trip.id)}
            className="interactive-btn rounded-card border border-primary/20 bg-white px-4 py-2.5 text-sm font-semibold text-primary"
          >
            View More
          </button>

          {canJoinChat ? (
            <button
              type="button"
              onClick={() => onJoinChat(trip.id)}
              className="interactive-btn rounded-card bg-accent px-4 py-2.5 text-sm font-semibold text-white"
            >
              Join Chat
            </button>
          ) : (
            <div className="rounded-card bg-primary/5 px-3 py-2.5 text-center text-xs font-semibold text-primary/75">
              Need &gt; 70% match to join
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default TripCardView;
