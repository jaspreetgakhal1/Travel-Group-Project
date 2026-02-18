import React from 'react';

const Hero: React.FC = () => {
  return (
    <section className="relative isolate overflow-hidden bg-background px-6 pb-24 pt-12 text-primary">
      <div
        className="mx-auto h-[460px] w-full max-w-7xl overflow-hidden rounded-card bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80')",
        }}
      >
        <div className="flex h-full w-full items-center bg-primary/45 px-8 sm:px-14">
          <h1 className="max-w-3xl text-3xl font-bold leading-tight text-background sm:text-5xl">
            Don&apos;t just dream it. Split the cost. Share the adventure.
          </h1>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-[360px] z-10 mx-auto flex w-full max-w-7xl justify-center px-6">
        <form className="pointer-events-auto grid w-full max-w-4xl gap-4 rounded-card border border-white/30 bg-white/20 p-4 shadow-xl backdrop-blur-md md:grid-cols-[1fr_1fr_auto] md:items-center md:p-5">
          <label className="flex flex-col gap-1 text-sm font-medium text-background">
            Destination
            <input
              type="text"
              placeholder="Where to?"
              className="rounded-card border border-white/50 bg-white/70 px-4 py-3 text-primary placeholder-primary/70 outline-none ring-accent/40 transition focus:ring-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-background">
            Vibe Type
            <input
              type="text"
              placeholder="Adventure, Chill, Culture..."
              className="rounded-card border border-white/50 bg-white/70 px-4 py-3 text-primary placeholder-primary/70 outline-none ring-accent/40 transition focus:ring-2"
            />
          </label>

          <button
            type="submit"
            className="rounded-card bg-accent px-6 py-3 text-sm font-semibold text-background transition hover:opacity-90"
          >
            Search Trips
          </button>
        </form>
      </div>
    </section>
  );
};

export default Hero;
