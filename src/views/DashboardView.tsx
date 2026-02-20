import { useEffect, useMemo, useState } from 'react';

type DashboardViewProps = {
  totalCompletedTrips: number;
  totalConnections: number;
  activePosts: number;
  availableFunds: number;
  walletCapacity: number;
};

type CountUpCardProps = {
  label: string;
  value: number;
};

const countDurationMs = 900;

function CountUpCard({ label, value }: CountUpCardProps) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    let frameId = 0;
    const start = performance.now();
    const targetValue = Math.max(0, Math.floor(value));

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / countDurationMs);
      setAnimatedValue(Math.round(progress * targetValue));
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [value]);

  return (
    <article className="rounded-card border border-primary/10 bg-white/95 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary/65">{label}</p>
      <p className="mt-2 text-3xl font-black text-primary">{animatedValue}</p>
    </article>
  );
}

function DashboardView({
  totalCompletedTrips,
  totalConnections,
  activePosts,
  availableFunds,
  walletCapacity,
}: DashboardViewProps) {
  const circleSize = 196;
  const strokeWidth = 14;
  const radius = (circleSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const targetRatio = Math.min(1, Math.max(0, availableFunds / walletCapacity));
  const [animatedRatio, setAnimatedRatio] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setAnimatedRatio(targetRatio), 120);
    return () => window.clearTimeout(timer);
  }, [targetRatio]);

  const dashOffset = useMemo(
    () => circumference - circumference * animatedRatio,
    [animatedRatio, circumference],
  );

  return (
    <section>
      <header className="mb-4 rounded-card border border-primary/10 bg-white/90 px-4 py-3 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/60">Analytics</p>
        <h2 className="text-2xl font-black text-primary">DashboardView</h2>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <CountUpCard label="Total Completed Trips" value={totalCompletedTrips} />
        <CountUpCard label="Total Connection" value={totalConnections} />
        <CountUpCard label="Active Posts" value={activePosts} />

        <article className="rounded-card border border-primary/10 bg-white/95 p-5 shadow-sm md:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/65">Wallet</p>
          <div className="mt-3 grid items-center gap-6 md:grid-cols-[220px_1fr]">
            <div className="relative mx-auto h-[196px] w-[196px]">
              <svg width={circleSize} height={circleSize} viewBox={`0 0 ${circleSize} ${circleSize}`} className="-rotate-90">
                <circle
                  cx={circleSize / 2}
                  cy={circleSize / 2}
                  r={radius}
                  fill="none"
                  stroke="rgba(61,64,91,0.16)"
                  strokeWidth={strokeWidth}
                />
                <circle
                  cx={circleSize / 2}
                  cy={circleSize / 2}
                  r={radius}
                  fill="none"
                  stroke="#3D405B"
                  strokeLinecap="round"
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  style={{ transition: 'stroke-dashoffset 800ms ease-out' }}
                />
              </svg>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary/65">Available Funds</p>
                <p className="mt-1 text-2xl font-black text-primary">${availableFunds.toFixed(0)}</p>
                <p className="text-xs text-primary/70">of ${walletCapacity.toFixed(0)}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-primary/80">
                Wallet availability updates in real time based on current commitments and released escrow.
              </p>
              <div className="h-2.5 overflow-hidden rounded-full bg-primary/15">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-700"
                  style={{ width: `${(animatedRatio * 100).toFixed(2)}%` }}
                />
              </div>
              <p className="text-sm font-semibold text-primary">{(targetRatio * 100).toFixed(1)}% of wallet capacity available</p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

export default DashboardView;
