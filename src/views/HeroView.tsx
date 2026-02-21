import React from 'react';

type HomeStat = {
  label: string;
  value: string;
};

type FeatureCard = {
  title: string;
  description: string;
};

type DestinationCard = {
  tripId: string;
  name: string;
  vibe: string;
  avgShare: number;
  imageUrl: string;
};

type CommunityPulse = {
  city: string;
  openGroups: number;
  mostWanted: string;
};

const homeStats: HomeStat[] = [
  { label: 'Trips Matched This Month', value: '2,840+' },
  { label: 'Average Cost Saved', value: '38%' },
  { label: 'Verified Hosts', value: '1,200+' },
  { label: 'Cities Available', value: '96' },
];

const featureCards: FeatureCard[] = [
  {
    title: 'Smart Vibe Matching',
    description: 'Get grouped with travelers who match your pace, budget, and trip energy.',
  },
  {
    title: 'Escrow Protection',
    description: 'Shared expenses are held securely and released with transparent tracking.',
  },
  {
    title: 'Safety Layer',
    description: 'Verification badges, SOS support, and trusted host scoring built in.',
  },
];

const featuredDestinations: DestinationCard[] = [
  {
    tripId: 'trip-2',
    name: 'Lisbon',
    vibe: 'Food + Nightlife',
    avgShare: 360,
    imageUrl:
      'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=1000&q=80',
  },
  {
    tripId: 'trip-1',
    name: 'Bali',
    vibe: 'Wellness + Beaches',
    avgShare: 420,
    imageUrl:
      'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=1000&q=80',
  },
  {
    tripId: 'trip-4',
    name: 'Tokyo',
    vibe: 'Culture + Cafes',
    avgShare: 470,
    imageUrl:
      'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1000&q=80',
  },
];

const communityPulse: CommunityPulse[] = [
  { city: 'Lisbon', openGroups: 42, mostWanted: 'Food explorers' },
  { city: 'Bali', openGroups: 31, mostWanted: 'Wellness travelers' },
  { city: 'Tokyo', openGroups: 27, mostWanted: 'Culture + cafe lovers' },
  { city: 'Iceland', openGroups: 18, mostWanted: 'Road-trip partners' },
];

type HeroViewProps = {
  onExploreTrip: (tripId: string) => void;
  onHostTrip: () => void;
};

const HeroView: React.FC<HeroViewProps> = ({ onExploreTrip, onHostTrip }) => {
  return (
    <section className="relative isolate overflow-hidden bg-transparent px-6 pb-16 pt-10 text-primary sm:pb-20">
      <div className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-24 h-72 w-72 rounded-full bg-success/25 blur-3xl" />

      <div
        className="mx-auto h-[520px] w-full max-w-7xl overflow-hidden rounded-card bg-cover bg-center shadow-2xl ring-1 ring-white/25"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80')",
        }}
      >
        <div className="grid h-full w-full gap-8 bg-gradient-to-r from-primary/85 via-primary/55 to-primary/30 px-8 py-10 sm:px-14 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
          <div className="self-center">
            <p className="mb-3 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
              SocialTravel Marketplace
            </p>
            <h1 className="max-w-3xl text-3xl font-black leading-tight text-white sm:text-5xl">
              Don&apos;t just dream it. Split the cost. Share the adventure.
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-white/90 sm:text-base">
              Discover compatible travel groups, split verified costs, and plan every detail together in one shared
              workspace.
            </p>
          </div>

          <div className="hidden self-start rounded-card border border-white/20 bg-white/10 p-5 text-white backdrop-blur-md lg:block">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Trending Right Now</p>
            <h3 className="mt-1 text-xl font-bold">Spring City Escapes</h3>
            <p className="mt-2 text-sm text-white/90">
              Top picks: Lisbon, Tokyo, and Cartagena with high vibe-match groups.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs">
              <span className="rounded-full bg-success px-2 py-1 font-semibold text-white">Verified Hosts</span>
              <span className="rounded-full bg-accent px-2 py-1 font-semibold text-white">Budget Splits</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-14 w-full max-w-7xl px-4 sm:px-6">
        <form className="grid w-full gap-4 rounded-card border border-primary/10 bg-white/92 p-4 shadow-xl backdrop-blur-md md:grid-cols-[1fr_1fr_auto] md:items-center md:p-5">
          <label className="flex flex-col gap-1 text-sm font-medium text-primary">
            Destination
            <input
              type="text"
              placeholder="Where to?"
              className="rounded-card border border-primary/15 bg-background/70 px-4 py-3 text-primary placeholder-primary/60 outline-none ring-accent/35 transition focus:ring-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-primary">
            Vibe Type
            <input
              type="text"
              placeholder="Adventure, Chill, Culture..."
              className="rounded-card border border-primary/15 bg-background/70 px-4 py-3 text-primary placeholder-primary/60 outline-none ring-accent/35 transition focus:ring-2"
            />
          </label>

          <button
            type="submit"
            className="rounded-card bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Search Trips
          </button>
        </form>
      </div>

      <div className="mx-auto mt-8 w-full max-w-7xl">
        <article
          className="relative overflow-hidden rounded-card bg-cover bg-center shadow-2xl ring-1 ring-white/25"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=1600&q=80')",
          }}
        >
          <div className="grid min-h-[300px] items-end bg-gradient-to-r from-primary/90 via-primary/70 to-primary/45 p-8 sm:p-10">
            <div className="max-w-3xl">
              <p className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/85">
                Host Corner
              </p>
              <h3 className="mt-4 text-3xl font-black leading-tight text-white sm:text-4xl">
                Want to travel but can&apos;t find the right crowd? Host a trip.
              </h3>
              <button
                type="button"
                onClick={onHostTrip}
                className="interactive-btn mt-5 rounded-card bg-white px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-white/90"
              >
                Host
              </button>
            </div>
          </div>
        </article>
      </div>

      <div className="mx-auto mt-10 w-full max-w-7xl">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {homeStats.map((stat) => (
            <article key={stat.label} className="rounded-card bg-white/95 p-4 shadow-lg ring-1 ring-primary/10 backdrop-blur-sm">
              <p className="text-xl font-bold text-primary">{stat.value}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-primary/70">{stat.label}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {featureCards.map((feature) => (
            <article key={feature.title} className="rounded-card bg-white/95 p-5 shadow-lg ring-1 ring-primary/10 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-primary">{feature.title}</h3>
              <p className="mt-2 text-sm text-primary/80">{feature.description}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-card bg-white/95 p-5 shadow-lg ring-1 ring-primary/10 backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Community Pulse</p>
          <h3 className="mt-1 text-xl font-bold text-primary">Live Group Demand (Dummy Data)</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {communityPulse.map((item) => (
              <article key={item.city} className="rounded-card bg-background/85 p-4 ring-1 ring-primary/10">
                <p className="text-lg font-bold text-primary">{item.city}</p>
                <p className="mt-1 text-sm text-primary/80">Open groups: {item.openGroups}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-primary/70">Most wanted: {item.mostWanted}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Featured Routes</p>
              <h2 className="text-2xl font-bold text-primary">Popular Group-Friendly Destinations</h2>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {featuredDestinations.map((destination) => (
              <article
                key={destination.name}
                className="overflow-hidden rounded-card bg-white/95 shadow-lg ring-1 ring-primary/10 backdrop-blur-sm"
              >
                <div className="h-44 w-full overflow-hidden">
                  <img
                    src={destination.imageUrl}
                    alt={destination.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-5">
                  <h3 className="text-xl font-semibold text-primary">{destination.name}</h3>
                  <p className="mt-1 text-sm text-primary/70">{destination.vibe}</p>
                  <p className="mt-3 text-sm text-primary/80">
                    Average share from <span className="font-bold text-primary">${destination.avgShare}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => onExploreTrip(destination.tripId)}
                    className="mt-4 rounded-card bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    Explore Trips
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroView;
