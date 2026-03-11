import React from 'react';
import type { Trip } from '../models/tripModel';
import TripCardView from './TripCardView';

type DiscoveryMatch = {
  trip: Trip;
  matchScore: number;
};

type DiscoveryFeedViewProps = {
  trips: DiscoveryMatch[];
  currentUserId?: string | null;
  currentUserName?: string;
  authToken?: string | null;
  onViewTrip: (tripId: string) => void;
  onJoinChat: (tripId: string) => void;
};

const DiscoveryFeedView: React.FC<DiscoveryFeedViewProps> = ({
  trips,
  currentUserId = null,
  currentUserName = 'Traveler',
  authToken = null,
  onViewTrip,
  onJoinChat,
}) => {
  return (
    <section id="discover" className="mx-auto w-full max-w-7xl px-6 pb-16 pt-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary/70">Vibe Profile</p>
          <h2 className="text-2xl font-bold text-primary">Trips For Your Style</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {trips.map((entry) => (
          <TripCardView
            key={entry.trip.id}
            trip={entry.trip}
            matchScore={entry.matchScore}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            authToken={authToken}
            onViewMore={onViewTrip}
            onJoinChat={onJoinChat}
          />
        ))}
      </div>
    </section>
  );
};

export default DiscoveryFeedView;
