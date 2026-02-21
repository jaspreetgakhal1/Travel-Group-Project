import React from 'react';
import DiscoveryFeedController from './DiscoveryFeedController';
import UserDashboardController from './UserDashboardController';
import HeroView from '../views/HeroView';
import NavbarView from '../views/NavbarView';

const AppController: React.FC = () => {
  const handleOpenTrip = () => {};
  const handleHostTrip = () => {};

  return (
    <div className="min-h-screen bg-background">
      <NavbarView />
      <main>
        <HeroView onExploreTrip={handleOpenTrip} onHostTrip={handleHostTrip} />
        <DiscoveryFeedController />
        <UserDashboardController />
      </main>
    </div>
  );
};

export default AppController;
