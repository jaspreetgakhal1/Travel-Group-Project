// Added by Codex: project documentation comment for src\components\DiscoveryFeed.tsx
import React from 'react';
import type { Trip } from '../types/trip';
import TripCard from './TripCard';

type DiscoveryFeedProps = {
  trips?: Trip[];
};

const DiscoveryFeed: React.FC<DiscoveryFeedProps> = ({ trips = [] }) => {
  return (
    <section id="discover" className="mx-auto w-full max-w-7xl px-6 pb-16 pt-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary/70">Vibe Profile</p>
          <h2 className="text-2xl font-bold text-primary">Trips For Your Style</h2>
        </div>
      </div>

      {trips.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      ) : (
        <div className="rounded-card border border-primary/10 bg-white/90 p-8 text-center shadow-sm">
          <h3 className="text-lg font-bold text-primary">No trip data loaded</h3>
          <p className="mt-2 text-sm text-primary/75">Trip recommendations now come from live data instead of static samples.</p>
        </div>
      )}
    </section>
  );
};

export default DiscoveryFeed;
