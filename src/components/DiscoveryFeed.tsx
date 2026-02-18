import React from 'react';
import type { Trip } from '../types/trip';
import TripCard from './TripCard';

const trips: Trip[] = [
  {
    id: 'trip-1',
    title: 'Bali Wellness Escape',
    hostName: 'Maya',
    priceShare: 420,
    matchPercentage: 93,
    imageUrl:
      'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=1000&q=80',
    isVerified: true,
  },
  {
    id: 'trip-2',
    title: 'Lisbon Food + Nightlife Week',
    hostName: 'Andre',
    priceShare: 360,
    matchPercentage: 88,
    imageUrl:
      'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=1000&q=80',
    isVerified: true,
  },
  {
    id: 'trip-3',
    title: 'Patagonia Trek Crew Trip',
    hostName: 'Sofia',
    priceShare: 510,
    matchPercentage: 95,
    imageUrl:
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=80',
    isVerified: false,
  },
  {
    id: 'trip-4',
    title: 'Tokyo Culture + Cafe Crawl',
    hostName: 'Kenji',
    priceShare: 470,
    matchPercentage: 84,
    imageUrl:
      'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1000&q=80',
    isVerified: true,
  },
  {
    id: 'trip-5',
    title: 'Iceland Northern Lights Drive',
    hostName: 'Leah',
    priceShare: 640,
    matchPercentage: 90,
    imageUrl:
      'https://images.unsplash.com/photo-1504893524553-b855bce32c67?auto=format&fit=crop&w=1000&q=80',
    isVerified: true,
  },
  {
    id: 'trip-6',
    title: 'Cartagena Beach + Music Weekend',
    hostName: 'Nico',
    priceShare: 330,
    matchPercentage: 86,
    imageUrl:
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1000&q=80',
    isVerified: false,
  },
];

const DiscoveryFeed: React.FC = () => {
  return (
    <section id="discover" className="mx-auto w-full max-w-7xl px-6 pb-16 pt-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary/70">Vibe Profile</p>
          <h2 className="text-2xl font-bold text-primary">Trips For Your Style</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {trips.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}
      </div>
    </section>
  );
};

export default DiscoveryFeed;
