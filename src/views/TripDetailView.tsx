import React from 'react';
import type { Trip } from '../models/tripModel';

type TripDetailViewProps = {
  trip: Trip;
  onBack: () => void;
};

const TripDetailView: React.FC<TripDetailViewProps> = ({ trip, onBack }) => {
  return (
    <section className="mx-auto w-full max-w-7xl px-6 pb-16 pt-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 rounded-card border border-primary/20 bg-white/95 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-background/80"
      >
        Back to Trips
      </button>

      <article className="overflow-hidden rounded-card bg-white/95 shadow-lg ring-1 ring-primary/10 backdrop-blur-sm">
        <div className="h-72 w-full overflow-hidden">
          <img src={trip.imageUrl} alt={trip.title} className="h-full w-full object-cover" />
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Trip Detail</p>
            <h1 className="mt-1 text-3xl font-bold text-primary">{trip.title}</h1>
            <p className="mt-2 text-sm text-primary/80">
              Hosted by <span className="font-semibold text-primary">{trip.hostName}</span>
              {trip.isVerified ? ' (Verified)' : ''}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-card bg-background/80 p-4 ring-1 ring-primary/10">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Route</p>
                <p className="mt-1 text-sm font-medium text-primary">{trip.route}</p>
              </div>
              <div className="rounded-card bg-background/80 p-4 ring-1 ring-primary/10">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Duration</p>
                <p className="mt-1 text-sm font-medium text-primary">{trip.duration}</p>
              </div>
              <div className="rounded-card bg-background/80 p-4 ring-1 ring-primary/10">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Price Per Share</p>
                <p className="mt-1 text-sm font-bold text-primary">${trip.priceShare}</p>
              </div>
              <div className="rounded-card bg-background/80 p-4 ring-1 ring-primary/10">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Expected From Partner</p>
                <p className="mt-1 text-sm font-bold text-primary">${trip.totalExpectedFromPartner}</p>
              </div>
            </div>

            <div className="mt-6">
              <h2 className="text-lg font-semibold text-primary">Partner Expectations</h2>
              <ul className="mt-2 space-y-2">
                {trip.partnerExpectations.map((expectation) => (
                  <li key={expectation} className="rounded-card bg-background/80 px-3 py-2 text-sm text-primary ring-1 ring-primary/10">
                    {expectation}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6">
              <h2 className="text-lg font-semibold text-primary">Host Notes</h2>
              <p className="mt-2 rounded-card bg-background/80 p-4 text-sm text-primary/85 ring-1 ring-primary/10">
                {trip.notes}
              </p>
            </div>
          </div>

          <aside className="rounded-card bg-background/80 p-5 ring-1 ring-primary/10">
            <h2 className="text-lg font-semibold text-primary">Trip Highlights</h2>
            <ul className="mt-3 space-y-2">
              {trip.highlights.map((highlight) => (
                <li key={highlight} className="rounded-card bg-white px-3 py-2 text-sm text-primary ring-1 ring-primary/10">
                  {highlight}
                </li>
              ))}
            </ul>

            <button
              type="button"
              className="mt-6 w-full rounded-card bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Request to Join
            </button>
          </aside>
        </div>
      </article>
    </section>
  );
};

export default TripDetailView;
