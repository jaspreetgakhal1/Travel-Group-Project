import React, { useState } from 'react';
import type { Trip } from '../models/tripModel';

type ReviewSystemViewProps = {
  trip: Trip;
  currentUserName: string;
  hasAlreadyReviewed: boolean;
  onSubmitReview: (organizerRating: number, travelerRating: number) => void;
};

const ReviewSystemView: React.FC<ReviewSystemViewProps> = ({
  trip,
  currentUserName,
  hasAlreadyReviewed,
  onSubmitReview,
}) => {
  const [organizerRating, setOrganizerRating] = useState(5);
  const [travelerRating, setTravelerRating] = useState(5);

  return (
    <section className="mx-auto w-full max-w-4xl px-6 pb-16 pt-8">
      <article className="rounded-card bg-white/95 p-8 shadow-lg ring-1 ring-primary/10 backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Review System</p>
        <h2 className="mt-1 text-3xl font-black text-primary">Rate Each Other</h2>
        <p className="mt-2 text-sm text-primary/80">
          Trip: {trip.title}. Submitting this review increments tours completed for both public profiles.
        </p>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-primary">Rate Organizer ({trip.hostName})</span>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={organizerRating}
              onChange={(event) => setOrganizerRating(Number(event.target.value))}
              className="mt-2 w-full accent-accent"
            />
            <p className="mt-1 text-sm text-primary/80">{organizerRating} / 5</p>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-primary">Rate Traveler ({currentUserName})</span>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={travelerRating}
              onChange={(event) => setTravelerRating(Number(event.target.value))}
              className="mt-2 w-full accent-accent"
            />
            <p className="mt-1 text-sm text-primary/80">{travelerRating} / 5</p>
          </label>
        </div>

        <button
          type="button"
          disabled={hasAlreadyReviewed}
          onClick={() => onSubmitReview(organizerRating, travelerRating)}
          className="interactive-btn mt-6 rounded-card bg-accent px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          {hasAlreadyReviewed ? 'Review Already Submitted' : 'Submit Review'}
        </button>
      </article>
    </section>
  );
};

export default ReviewSystemView;
