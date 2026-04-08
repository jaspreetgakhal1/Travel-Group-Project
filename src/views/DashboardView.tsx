
import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchCurrentUser } from '../services/authApi';
import { fetchDashboardStats, type DashboardStats } from '../services/dashboardApi';
import { reviewJoinRequest } from '../services/tripRequestApi';
import FastImage from '../components/FastImage';


type DashboardViewProps = {
  authToken: string | null;
  onOpenLatestDecision?: (tripId: string, voteId: string) => void;
  onStartFirstJourney: () => void;
  onVerificationStatusSync?: (isVerified: boolean) => void;
};

const REFRESH_INTERVAL_MS = 30000;

const EMPTY_DASHBOARD_STATS: DashboardStats = {
  activeTripsCount: 0,
  pendingRequests: 0,
  totalParticipants: 0,
  upcomingDestination: null,
  upcomingTrip: null,
  pendingRequestItems: [],
  activeTripBuddies: [],
  completedTripsCount: 0,
  upcomingTripsCount: 0,
  totalTripsCount: 0,
  latestDecision: null,
};

const formatCountdown = (targetDate: Date | null, nowMs: number): string => {
  if (!targetDate) {
    return 'No upcoming trip';
  }

  const diffMs = targetDate.getTime() - nowMs;
  if (diffMs <= 0) {
    return 'In progress';
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
};

const getInitials = (name: string): string => {
  const chunks = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (chunks.length === 0) {
    return 'TR';
  }

  return chunks
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? '')
    .join('');
};

const formatRequestDate = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Just now';
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
};

const formatTripDate = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Date TBD';
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getDestinationImageUrl = (destination: string | null, backendImageUrl: string | null): string | null => {
  if (backendImageUrl && backendImageUrl.trim()) {
    return backendImageUrl;
  }

  if (!destination) {
    return null;
  }

  return `https://source.unsplash.com/1200x700/?${encodeURIComponent(`${destination},travel`)}`;
};

function DashboardView({ authToken, onOpenLatestDecision, onStartFirstJourney, onVerificationStatusSync }: DashboardViewProps) {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_DASHBOARD_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestActionLoadingId, setRequestActionLoadingId] = useState<string | null>(null);
  const [requestActionMessage, setRequestActionMessage] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const loadStats = useCallback(
    async (token: string, showInitialLoader = false) => {
      if (showInitialLoader) {
        setIsLoading(true);
      }

      try {
        const nextStats = await fetchDashboardStats(token);
        setStats(nextStats);
        setErrorMessage(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to load dashboard stats.';
        setErrorMessage(message);
        setStats(EMPTY_DASHBOARD_STATS);
      } finally {
        if (showInitialLoader) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!authToken) {
      setStats(EMPTY_DASHBOARD_STATS);
      setIsLoading(false);
      setErrorMessage(null);
      setRequestActionLoadingId(null);
      return;
    }

    let isActive = true;

    const refreshStats = async (showLoader = false) => {
      if (!isActive) {
        return;
      }

      if (showLoader) {
        setIsLoading(true);
      }

      try {
        const nextStats = await fetchDashboardStats(authToken);
        if (!isActive) {
          return;
        }

        setStats(nextStats);
        setErrorMessage(null);
      } catch (error) {
        if (!isActive) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Unable to load dashboard stats.';
        setErrorMessage(message);
        setStats(EMPTY_DASHBOARD_STATS);
      } finally {
        if (showLoader && isActive) {
          setIsLoading(false);
        }
      }
    };

    void refreshStats(true);
    const refreshTimer = window.setInterval(() => {
      void refreshStats(false);
    }, REFRESH_INTERVAL_MS);

    return () => {
      isActive = false;
      window.clearInterval(refreshTimer);
    };
  }, [authToken]);

  useEffect(() => {
    if (!requestActionMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setRequestActionMessage(null);
    }, 3000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [requestActionMessage]);

  useEffect(() => {
    if (!authToken || !onVerificationStatusSync) {
      return;
    }

    let isActive = true;
    const silentCheck = async () => {
      try {
        const user = await fetchCurrentUser(authToken);
        if (isActive) {
          onVerificationStatusSync(Boolean(user.isVerified));
        }
      } catch {
        // Silent check should never block dashboard rendering.
      }
    };

    void silentCheck();
    const timer = window.setInterval(() => {
      void silentCheck();
    }, 60000);

    return () => {
      isActive = false;
      window.clearInterval(timer);
    };
  }, [authToken, onVerificationStatusSync]);

  const handleReviewRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    if (!authToken || requestActionLoadingId) {
      return;
    }

    setRequestActionLoadingId(requestId);
    setRequestActionMessage(null);

    try {
      await reviewJoinRequest(requestId, status, authToken);
      setStats((previous) => ({
        ...previous,
        pendingRequests: Math.max(0, previous.pendingRequests - 1),
        pendingRequestItems: previous.pendingRequestItems.filter((item) => item.id !== requestId),
      }));
      await loadStats(authToken, false);
      setRequestActionMessage(status === 'accepted' ? 'Join request accepted.' : 'Join request rejected.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to review request right now.';
      setRequestActionMessage(message);
    } finally {
      setRequestActionLoadingId(null);
    }
  };

  const hasTrips = stats.totalTripsCount > 0;
  const pendingItems = stats.pendingRequestItems.slice(0, 4);
  const activeBuddies = stats.activeTripBuddies.slice(0, 8);
  const upcomingStartDate = useMemo(() => {
    if (!stats.upcomingTrip?.startDate) {
      return null;
    }

    const parsed = new Date(stats.upcomingTrip.startDate);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [stats.upcomingTrip?.startDate]);
  const countdownLabel = formatCountdown(upcomingStartDate, nowMs);
  const destinationImageUrl = getDestinationImageUrl(stats.upcomingDestination, stats.upcomingTrip?.imageUrl ?? null);
  const startTripButton = (
    <button
      type="button"
      onClick={onStartFirstJourney}
      className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-accent to-success px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
    >
      Start your first journey
    </button>
  );

  return (
    <section>
      <header className="mb-4 rounded-card border border-primary/20 bg-gradient-to-r from-primary via-primary to-accent px-4 py-3 shadow-md">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">Dashboard</p>
        <h2 className="text-2xl font-black text-white">Your Trip Command Center</h2>
      </header>

      {errorMessage ? (
        <p className="mb-4 rounded-card border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
          {errorMessage}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:grid-rows-2">
        <article className="overflow-hidden rounded-card border border-accent/25 bg-gradient-to-br from-white via-background/90 to-accent/10 shadow-sm lg:col-span-2">
          {stats.upcomingTrip ? (
            <>
              <div className="relative h-48 sm:h-56">
                {destinationImageUrl ? (
                  <FastImage
                    src={destinationImageUrl}
                    alt={stats.upcomingTrip.location}
                    className="h-full w-full object-cover"
                    fetchPriority="high"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-primary/70 via-primary/45 to-accent/45" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/85 via-primary/30 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">Upcoming Trip</p>
                  <h3 className="mt-1 text-2xl font-black text-white">{stats.upcomingTrip.location}</h3>
                </div>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/65">Countdown</p>
                  <p className="mt-1 text-3xl font-black text-primary">{countdownLabel}</p>
                  <p className="mt-1 text-sm text-primary/75">Starts {formatTripDate(stats.upcomingTrip.startDate)}</p>
                </div>
                <div className="grid gap-3">
                  <div className="rounded-card border border-success/25 bg-success/15 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary/65">Active Trips</p>
                    <p className="mt-1 text-2xl font-black text-primary">{stats.activeTripsCount}</p>
                  </div>
                  <div className="rounded-card border border-accent/25 bg-accent/15 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary/65">Upcoming Destination</p>
                    <p className="mt-1 text-base font-semibold text-primary">
                      {stats.upcomingDestination ?? 'No destination yet'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center px-6 py-8 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/60">Upcoming Trip</p>
              <h3 className="mt-2 text-2xl font-black text-primary">No trips on your calendar yet</h3>
              <p className="mt-2 max-w-md text-sm text-primary/75">
                Plan your next destination to unlock countdowns, action items, and live participant metrics.
              </p>
              <div className="mt-5">{startTripButton}</div>
            </div>
          )}
        </article>

        <article className="rounded-card border border-accent/25 bg-gradient-to-br from-accent/15 via-white to-background p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/60">Action Required</p>
          <h3 className="mt-1 text-xl font-black text-primary">{stats.pendingRequests} Pending Join Requests</h3>
          {requestActionMessage ? <p className="mt-2 text-xs font-medium text-primary/75">{requestActionMessage}</p> : null}
          {pendingItems.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {pendingItems.map((item) => (
                <li key={item.id} className="rounded-card border border-accent/20 bg-white/90 px-3 py-2.5">
                  <p className="text-sm font-semibold text-primary">{item.requesterName}</p>
                  <p className="text-xs text-primary/75">{item.tripTitle}</p>
                  <p className="mt-1 text-xs text-primary/60">Requested {formatRequestDate(item.requestedAt)}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleReviewRequest(item.id, 'accepted')}
                      disabled={requestActionLoadingId !== null}
                      className="rounded-full bg-success px-3 py-1 text-xs font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {requestActionLoadingId === item.id ? 'Updating...' : 'Accept'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleReviewRequest(item.id, 'rejected')}
                      disabled={requestActionLoadingId !== null}
                      className="rounded-full border border-accent/30 bg-accent/15 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 rounded-card bg-background px-4 py-5 text-center">
              <p className="text-sm text-primary/75">
                {hasTrips ? 'No pending requests right now.' : 'No requests yet because you have no hosted trips.'}
              </p>
              {!hasTrips ? <div className="mt-3">{startTripButton}</div> : null}
            </div>
          )}
        </article>

        <article className="rounded-card border border-success/30 bg-gradient-to-br from-success/20 via-white to-background p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/60">Travel Buddies</p>
          <h3 className="mt-1 text-xl font-black text-primary">{stats.totalParticipants} Participants</h3>
          {activeBuddies.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-3">
              {activeBuddies.map((buddy) => (
                <div
                  key={buddy.id}
                  className="group relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-success/40 bg-gradient-to-br from-success/30 to-accent/30 text-xs font-bold text-primary"
                  title={buddy.name}
                >
                  {buddy.profileImageDataUrl ? (
                    <img src={buddy.profileImageDataUrl} alt={buddy.name} className="h-full w-full object-cover" />
                  ) : (
                    <span>{getInitials(buddy.name)}</span>
                  )}
                  <span className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-primary px-2 py-1 text-[10px] font-semibold text-background opacity-0 transition group-hover:opacity-100">
                    {buddy.name}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-card bg-background px-4 py-5 text-center">
              <p className="text-sm text-primary/75">
                {hasTrips ? 'No active trip participants yet.' : 'Start a trip to meet your travel buddies.'}
              </p>
              {!hasTrips ? <div className="mt-3">{startTripButton}</div> : null}
            </div>
          )}
        </article>

        <article className="rounded-card border border-primary/20 bg-gradient-to-br from-primary/12 via-white to-[#F4F1DE] p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/60">Decision Made</p>
          <h3 className="mt-1 text-xl font-black text-primary">
            {stats.latestDecision ? stats.latestDecision.placeName : 'No itinerary decision yet'}
          </h3>
          {stats.latestDecision ? (
            <>
              <p className="mt-2 text-sm text-primary/75">
                {stats.latestDecision.tripTitle} chose {stats.latestDecision.placeName}.
              </p>
              <p className="mt-1 text-xs text-primary/60">
                {stats.latestDecision.decisionMadeAt
                  ? `Recorded ${new Date(stats.latestDecision.decisionMadeAt).toLocaleString()}`
                  : stats.latestDecision.tripLocation}
              </p>
              <button
                type="button"
                onClick={() => onOpenLatestDecision?.(stats.latestDecision!.tripId, stats.latestDecision!.voteId)}
                className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
              >
                Open decision
              </button>
            </>
          ) : (
            <div className="mt-4 rounded-card bg-background px-4 py-5 text-center">
              <p className="text-sm text-primary/75">Once your group locks a destination, it will appear here.</p>
            </div>
          )}
        </article>

        <article className="rounded-card border border-primary/20 bg-gradient-to-br from-primary/10 via-white to-accent/10 p-5 shadow-sm lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/60">Quick Stats</p>
          <h3 className="mt-1 text-xl font-black text-primary">Trips Taken vs Upcoming</h3>
          {hasTrips ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-card border border-accent/25 bg-accent/15 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Trips Taken</p>
                <p className="mt-1 text-2xl font-black text-primary">{stats.completedTripsCount}</p>
              </div>
              <div className="rounded-card border border-success/25 bg-success/15 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Upcoming</p>
                <p className="mt-1 text-2xl font-black text-primary">{stats.upcomingTripsCount}</p>
              </div>
              <div className="rounded-card border border-primary/20 bg-primary/10 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Active</p>
                <p className="mt-1 text-2xl font-black text-primary">{stats.activeTripsCount}</p>
              </div>
              <div className="rounded-card border border-accent/20 bg-background px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Hosted Total</p>
                <p className="mt-1 text-2xl font-black text-primary">{stats.totalTripsCount}</p>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-card bg-background px-4 py-6 text-center">
              <p className="text-sm text-primary/75">No trip stats yet.</p>
              <div className="mt-3">{startTripButton}</div>
            </div>
          )}
        </article>
      </div>

      {isLoading ? <p className="mt-4 text-sm font-medium text-accent">Loading live dashboard metrics...</p> : null}
    </section>
  );
}

export default DashboardView;

