import React from 'react';

const Navbar: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 text-primary">
        <a href="#" className="text-xl font-bold tracking-tight">
          SocialTravel
        </a>

        <ul className="hidden items-center gap-8 text-sm font-medium md:flex">
          <li>
            <a href="#discover" className="transition hover:text-accent">
              Discover
            </a>
          </li>
          <li>
            <a href="#trips" className="transition hover:text-accent">
              Trips
            </a>
          </li>
          <li>
            <a href="#hosts" className="transition hover:text-accent">
              Hosts
            </a>
          </li>
        </ul>

        <button
          type="button"
          className="rounded-card bg-accent px-4 py-2 text-sm font-semibold text-background transition hover:opacity-90"
        >
          Sign In
        </button>
      </nav>
    </header>
  );
};

export default Navbar;
