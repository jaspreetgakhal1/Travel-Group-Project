import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Ban,
  CheckCircle2,
  Clock3,
  Trash2,
  Users,
  UserRoundCheck,
} from 'lucide-react';
import {
  fetchAdminStats,
  fetchPendingVerificationUsers,
  type AdminStats,
  type AdminTripLifecycle,
  type AdminUserFilter,
  type PendingVerificationUser,
} from '../services/adminApi';

type AdminDashboardViewProps = {
  authToken: string;
  onOpenUserList: (filter: AdminUserFilter) => void;
};

const EMPTY_TRIP_LIFECYCLE: AdminTripLifecycle = {
  completed: 0,
  active: 0,
  pending: 0,
  cancelled: 0,
};

const EMPTY_ADMIN_STATS: AdminStats = {
  totalUsers: 0,
  totalVerifiedUsers: 0,
  totalPendingUsers: 0,
  totalBlockedUsers: 0,
  totalDeletedUsers: 0,
  totalCompletedTrips: 0,
  totalPendingTrips: 0,
  totalTrips: 0,
  grossTripTotal: 0,
  successRate: 0,
  tripLifecycle: EMPTY_TRIP_LIFECYCLE,
  dateRange: {
    from: null,
    to: null,
  },
};

const CARD_ANIMATION = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

const STAGGER_CONTAINER = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return 'Not available';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Not available';
  }

  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getUserInitials = (name: string): string => {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return 'TR';
  }

  return parts.map((part) => part.charAt(0).toUpperCase()).join('');
};

function AdminDashboardView({ authToken, onOpenUserList }: AdminDashboardViewProps) {
  const [stats, setStats] = useState<AdminStats>(EMPTY_ADMIN_STATS);
  const [recentActivity, setRecentActivity] = useState<PendingVerificationUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    from: '',
    to: '',
  });

  const loadDashboard = async (showLoader = true) => {
    if (showLoader) {
      setIsLoading(true);
    }

    try {
      const [nextStats, nextRecentActivity] = await Promise.all([
        fetchAdminStats(authToken, {
          from: dateRange.from || undefined,
          to: dateRange.to || undefined,
        }),
        fetchPendingVerificationUsers(authToken, { limit: 6 }),
      ]);

      setStats(nextStats);
      setRecentActivity(nextRecentActivity);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load the admin dashboard right now.');
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadDashboard(true);
  }, [authToken, dateRange.from, dateRange.to]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadDashboard(false);
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [authToken, dateRange.from, dateRange.to]);

  const statCards = useMemo(
    () => [
      {
        title: 'Total Users',
        count: stats.totalUsers,
        helper: 'Active accounts on the platform',
        filter: 'all' as AdminUserFilter,
        icon: Users,
        accentClass: 'from-sky-500/10 via-sky-500/5 to-white text-sky-600',
      },
      {
        title: 'Pending Verification',
        count: stats.totalPendingUsers,
        helper: 'Ready for review',
        filter: 'pending' as AdminUserFilter,
        icon: Clock3,
        accentClass: 'from-amber-500/10 via-amber-500/5 to-white text-amber-600',
      },
      {
        title: 'Verified Users',
        count: stats.totalVerifiedUsers,
        helper: `${stats.successRate}% trip completion rate`,
        filter: 'verified' as AdminUserFilter,
        icon: UserRoundCheck,
        accentClass: 'from-emerald-500/10 via-emerald-500/5 to-white text-emerald-600',
      },
      {
        title: 'Blocked Users',
        count: stats.totalBlockedUsers,
        helper: 'Restricted from access',
        filter: 'blocked' as AdminUserFilter,
        icon: Ban,
        accentClass: 'from-violet-500/10 via-violet-500/5 to-white text-violet-600',
      },
      {
        title: 'Deleted Users',
        count: stats.totalDeletedUsers,
        helper: 'Audit trail snapshots',
        filter: 'deleted' as AdminUserFilter,
        icon: Trash2,
        accentClass: 'from-slate-400/20 via-slate-400/10 to-white text-slate-600',
      },
    ],
    [stats.successRate, stats.totalBlockedUsers, stats.totalDeletedUsers, stats.totalPendingUsers, stats.totalUsers, stats.totalVerifiedUsers],
  );

  const tripLifecycleData = useMemo(
    () => [
      { name: 'Completed', value: stats.tripLifecycle.completed, color: '#10b981' },
      { name: 'Active', value: stats.tripLifecycle.active, color: '#0ea5e9' },
      { name: 'Pending', value: stats.tripLifecycle.pending, color: '#f59e0b' },
      { name: 'Cancelled', value: stats.tripLifecycle.cancelled, color: '#f43f5e' },
    ],
    [stats.tripLifecycle],
  );

  const totalPendingReviews = recentActivity.length;

  return (
    <section className="mx-auto w-full max-w-7xl px-6 pb-16 pt-8">
      <div className="rounded-[2rem] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.1),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(139,92,246,0.12),_transparent_30%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96))] p-6 shadow-[0_36px_100px_rgba(15,23,42,0.14)]">
        <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Admin Intelligence Hub</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">Interactive Verification and Trip Operations Dashboard</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Follow verification flow in real time, drill into user cohorts, and watch trip lifecycle distribution update as you adjust the date window.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white/80 px-4 py-3 text-right shadow-sm backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Live Review Queue</p>
            <p className="mt-1 text-3xl font-black text-slate-950">{totalPendingReviews}</p>
            <p className="text-sm text-slate-500">recent verification requests</p>
          </div>
        </div>

        {errorMessage ? (
          <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        <motion.div
          variants={STAGGER_CONTAINER}
          initial="hidden"
          animate="visible"
          className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-5"
        >
          {statCards.map((card) => {
            const Icon = card.icon;

            return (
              <motion.button
                key={card.title}
                type="button"
                variants={CARD_ANIMATION}
                whileHover={{ scale: 1.05 }}
                onClick={() => onOpenUserList(card.filter)}
                className={`group rounded-3xl border border-slate-200/80 bg-white/80 bg-gradient-to-br ${card.accentClass} p-5 text-left shadow-sm backdrop-blur-xl transition`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{card.title}</p>
                    <p className="mt-4 text-4xl font-black text-slate-950">{card.count}</p>
                  </div>
                  <div className="rounded-2xl bg-white/80 p-3 shadow-sm">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-500">{card.helper}</p>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 transition group-hover:text-slate-600">
                  Open list view
                </p>
              </motion.button>
            );
          })}
        </motion.div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
          <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl">
            <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Trip Lifecycle</p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">Real-Time Portfolio Distribution</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Filter by date range to recalculate how trips are distributed across the lifecycle.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">From</span>
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(event) => setDateRange((current) => ({ ...current, from: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">To</span>
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(event) => setDateRange((current) => ({ ...current, to: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300"
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(220px,0.85fr)]">
              <div className="relative h-[320px] rounded-3xl bg-slate-50/80 p-4">
                {isLoading ? (
                  <div className="flex h-full items-center justify-center text-sm font-medium text-slate-500">Loading chart...</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip
                          formatter={(value, name) => [typeof value === 'number' ? value : 0, String(name)]}
                          contentStyle={{
                            borderRadius: '18px',
                            borderColor: '#e2e8f0',
                            boxShadow: '0 18px 40px rgba(15, 23, 42, 0.12)',
                          }}
                        />
                        <Pie
                          data={tripLifecycleData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={82}
                          outerRadius={120}
                          paddingAngle={4}
                          stroke="rgba(255,255,255,0.9)"
                          strokeWidth={3}
                        >
                          {tripLifecycleData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="rounded-full bg-white/90 px-6 py-4 text-center shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Total Trips</p>
                        <p className="mt-1 text-3xl font-black text-slate-950">{stats.totalTrips}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="grid gap-3">
                {tripLifecycleData.map((item) => (
                  <div key={item.name} className="rounded-3xl border border-slate-200/80 bg-slate-50/80 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <p className="text-sm font-semibold text-slate-700">{item.name}</p>
                      </div>
                      <p className="text-2xl font-black text-slate-950">{item.value}</p>
                    </div>
                  </div>
                ))}

                <div className="rounded-3xl border border-emerald-100 bg-emerald-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Completed Trips</p>
                  <p className="mt-2 text-2xl font-black text-emerald-900">{stats.totalCompletedTrips}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Recent Activity</p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">Live Verification Requests</h3>
              </div>
              <button
                type="button"
                onClick={() => onOpenUserList('pending')}
                className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Review Queue
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {isLoading ? (
                <p className="py-10 text-sm font-medium text-slate-500">Loading recent activity...</p>
              ) : recentActivity.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center">
                  <p className="text-lg font-semibold text-slate-900">No pending requests right now.</p>
                  <p className="mt-2 text-sm text-slate-500">New verification uploads will appear here automatically.</p>
                </div>
              ) : (
                recentActivity.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => onOpenUserList('pending')}
                    className="flex w-full items-start gap-3 rounded-3xl border border-slate-200/80 bg-slate-50/80 p-4 text-left transition hover:border-sky-200 hover:bg-sky-50/70"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-sky-100 text-sm font-bold text-sky-700">
                      {user.profileImageDataUrl ? (
                        <img src={user.profileImageDataUrl} alt={user.name} className="h-full w-full object-cover" />
                      ) : (
                        <span>{getUserInitials(user.name)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-slate-900">{user.name}</p>
                        <span className="rounded-2xl bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                          Pending
                        </span>
                      </div>
                      <p className="truncate text-sm text-slate-500">{user.email || user.userId}</p>
                      <p className="mt-2 text-xs text-slate-400">Uploaded {formatDateTime(user.verificationUploadedAt)}</p>
                      <p className="mt-1 truncate text-xs font-medium text-slate-500">
                        {user.verificationDocumentName ?? 'Identity document'}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200/80 bg-slate-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Snapshot</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white px-4 py-3">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]">Verified</p>
                  </div>
                  <p className="mt-2 text-2xl font-black text-slate-950">{stats.totalVerifiedUsers}</p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <div className="flex items-center gap-2 text-violet-600">
                    <Ban className="h-4 w-4" />
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]">Blocked</p>
                  </div>
                  <p className="mt-2 text-2xl font-black text-slate-950">{stats.totalBlockedUsers}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AdminDashboardView;
