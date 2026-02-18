import React from 'react';
import { tripCatalog } from '../models/tripModel';
import DiscoveryFeedView from '../views/DiscoveryFeedView';

const DiscoveryFeedController: React.FC = () => {
  const discoveryEntries = tripCatalog.map((trip) => ({
    trip,
    matchScore: trip.matchPercentage,
  }));

  return <DiscoveryFeedView trips={discoveryEntries} onViewTrip={() => {}} onJoinChat={() => {}} />;
};

export default DiscoveryFeedController;
