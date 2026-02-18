import React from 'react';
import type { Trip } from '../types/trip';

type TripCardProps = {
  trip: Trip;
};

const TripCard: React.FC<TripCardProps> = ({ trip }) => {
  return (
    <article className="overflow-hidden rounded-card bg-white shadow-sm ring-1 ring-primary/10">
      <div className="relative h-52 w-full overflow-hidden">
        <img
          src={trip.imageUrl}
          alt={trip.title}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <span className="absolute right-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-background">
          {trip.matchPercentage}% Match
        </span>
      </div>

      <div className="space-y-3 p-5 text-primary">
        <h3 className="text-lg font-semibold leading-snug">{trip.title}</h3>

        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Host: {trip.hostName}</span>
          {trip.isVerified && (
            <span className="rounded-full bg-success/20 px-2 py-0.5 text-xs font-semibold text-primary ring-1 ring-success/40">
              Verified
            </span>
          )}
        </div>

        <p className="text-sm text-primary/80">
          Price per share:{' '}
          <span className="text-base font-bold text-primary">${trip.priceShare}</span>
        </p>

        <button
          type="button"
          className="w-full rounded-card bg-accent px-4 py-2.5 text-sm font-semibold text-background transition hover:opacity-90"
        >
          View More
        </button>
      </div>
    </article>
  );
};

export default TripCard;
