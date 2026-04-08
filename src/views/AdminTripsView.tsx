import { useEffect, useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { MapPin, Route, Search, Users } from 'lucide-react';
import {
  fetchAdminStats,
  fetchAdminTrips,
  type AdminStats,
  type AdminTripRecord,
} from '../services/adminApi';

type AdminTripsViewProps = {
  authToken: string;
};

type TripDateSort =
  | 'from_asc'
  | 'from_desc'
  | 'to_asc'
  | 'to_desc';

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
  tripLifecycle: {
    completed: 0,
    active: 0,
    pending: 0,
    cancelled: 0,
  },
  dateRange: {
    from: null,
    to: null,
  },
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const formatSingleDate = (value: string | null): string => {
  if (!value) {
    return 'Not available';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Not available';
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getDateValue = (value: string | null, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.getTime();
};

const getStatusStyles = (status: AdminTripRecord['status']) => {
  switch (status) {
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    case 'active':
      return 'bg-sky-50 text-sky-700 ring-sky-200';
    case 'cancelled':
      return 'bg-rose-50 text-rose-700 ring-rose-200';
    case 'upcoming':
    default:
      return 'bg-amber-50 text-amber-700 ring-amber-200';
  }
};

function AdminTripsView({ authToken }: AdminTripsViewProps) {
  const [stats, setStats] = useState<AdminStats>(EMPTY_ADMIN_STATS);
  const [trips, setTrips] = useState<AdminTripRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tripDateSort, setTripDateSort] = useState<TripDateSort>('from_asc');
  const [dateRange, setDateRange] = useState({
    from: '',
    to: '',
  });

  const loadTripsWorkspace = async (showLoader = true) => {
    if (showLoader) {
      setIsLoading(true);
    }

    try {
      const [nextStats, nextTrips] = await Promise.all([
        fetchAdminStats(authToken, {
          from: dateRange.from || undefined,
          to: dateRange.to || undefined,
        }),
        fetchAdminTrips(authToken, {
          from: dateRange.from || undefined,
          to: dateRange.to || undefined,
        }),
      ]);

      setStats(nextStats);
      setTrips(nextTrips);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load trip operations right now.');
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadTripsWorkspace(true);
  }, [authToken, dateRange.from, dateRange.to]);

  const tripChartData = useMemo(
    () => [
      { name: 'Completed', value: stats.tripLifecycle.completed, color: '#10b981' },
      { name: 'Active', value: stats.tripLifecycle.active, color: '#0ea5e9' },
      { name: 'Pending', value: stats.tripLifecycle.pending, color: '#f59e0b' },
      { name: 'Cancelled', value: stats.tripLifecycle.cancelled, color: '#f43f5e' },
    ],
    [stats.tripLifecycle],
  );

  const visibleTrips = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    const filteredTrips = normalizedQuery
      ? trips.filter((trip) =>
          [trip.title, trip.hostName, trip.destination]
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery),
        )
      : trips;

    return [...filteredTrips].sort((leftTrip, rightTrip) => {
      const leftFromDate = getDateValue(leftTrip.startDate, Number.POSITIVE_INFINITY);
      const rightFromDate = getDateValue(rightTrip.startDate, Number.POSITIVE_INFINITY);
      const leftToDate = getDateValue(leftTrip.endDate, Number.POSITIVE_INFINITY);
      const rightToDate = getDateValue(rightTrip.endDate, Number.POSITIVE_INFINITY);

      switch (tripDateSort) {
        case 'from_desc':
          return rightFromDate - leftFromDate;
        case 'to_asc':
          return leftToDate - rightToDate;
        case 'to_desc':
          return rightToDate - leftToDate;
        case 'from_asc':
        default:
          return leftFromDate - rightFromDate;
      }
    });
  }, [searchTerm, tripDateSort, trips]);

  const activeTripCount = stats.tripLifecycle.active;
  const averageBudget = stats.totalTrips > 0 ? stats.grossTripTotal / stats.totalTrips : 0;

  return (
    <section className="mx-auto w-full max-w-7xl px-6 pb-16 pt-8">
      <div className="rounded-[2rem] border border-slate-200/80 bg-white/80 p-6 shadow-[0_32px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Trip Operations</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">Trip analytics and searchable route inventory</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Review lifecycle distribution, monitor hosted routes, and search trips by title, hosted user, or destination.
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

        {errorMessage ? (
          <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-slate-200/80 bg-slate-50/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Total Trips</p>
            <p className="mt-3 text-4xl font-black text-slate-950">{stats.totalTrips}</p>
            <p className="mt-2 text-sm text-slate-500">Trips within the selected date window</p>
          </article>
          <article className="rounded-3xl border border-sky-100 bg-sky-50/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Active Trips</p>
            <p className="mt-3 text-4xl font-black text-slate-950">{activeTripCount}</p>
            <p className="mt-2 text-sm text-slate-500">Currently underway</p>
          </article>
          <article className="rounded-3xl border border-emerald-100 bg-emerald-50/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Completed</p>
            <p className="mt-3 text-4xl font-black text-slate-950">{stats.tripLifecycle.completed}</p>
            <p className="mt-2 text-sm text-slate-500">Finished trips</p>
          </article>
          <article className="rounded-3xl border border-violet-100 bg-violet-50/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Average Budget</p>
            <p className="mt-3 text-4xl font-black text-slate-950">{currencyFormatter.format(averageBudget)}</p>
            <p className="mt-2 text-sm text-slate-500">Per trip across the current set</p>
          </article>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_1.85fr]">
          <div className="rounded-3xl border border-slate-200/80 bg-slate-50/80 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Trip Status Mix</p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">Lifecycle Donut</h3>
              </div>
              <div className="rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-600">
                {stats.totalTrips} trips
              </div>
            </div>

            <div className="relative mt-5 h-[320px]">
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
                        data={tripChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={78}
                        outerRadius={116}
                        paddingAngle={4}
                        stroke="rgba(255,255,255,0.95)"
                        strokeWidth={3}
                      >
                        {tripChartData.map((entry) => (
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

            <div className="mt-4 grid gap-3">
              {tripChartData.map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <p className="text-sm font-semibold text-slate-700">{item.name}</p>
                  </div>
                  <p className="text-xl font-black text-slate-950">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5">
            <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Trip Directory</p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">Hosted trips</h3>
              </div>

              <div className="grid w-full gap-3 lg:max-w-2xl lg:grid-cols-[minmax(0,1fr)_240px]">
                <label className="relative block w-full">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-11 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300"
                    placeholder="Search by title, host, or destination"
                  />
                </label>

                <label className="block">
                  <span className="sr-only">Sort trips by date</span>
                  <select
                    value={tripDateSort}
                    onChange={(event) => setTripDateSort(event.target.value as TripDateSort)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-300"
                  >
                    <option value="from_asc">From Date: Earliest first</option>
                    <option value="from_desc">From Date: Latest first</option>
                    <option value="to_asc">To Date: Earliest first</option>
                    <option value="to_desc">To Date: Latest first</option>
                  </select>
                </label>
              </div>
            </div>

            {isLoading ? (
              <p className="py-12 text-sm font-medium text-slate-500">Loading trips...</p>
            ) : visibleTrips.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-lg font-semibold text-slate-900">No trips found.</p>
                <p className="mt-2 text-sm text-slate-500">Adjust the date range or search term to find another set of trips.</p>
              </div>
            ) : (
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-3">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      <th className="px-3 pb-1">Trip Title</th>
                      <th className="px-3 pb-1">Hosted User</th>
                      <th className="px-3 pb-1">Destination</th>
                      <th className="px-3 pb-1">Status</th>
                      <th className="px-3 pb-1">From Date</th>
                      <th className="px-3 pb-1">To Date</th>
                      <th className="px-3 pb-1">Capacity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleTrips.map((trip) => (
                      <tr key={trip.id} className="rounded-3xl bg-slate-50/80 shadow-sm ring-1 ring-slate-200/80">
                        <td className="rounded-l-3xl px-3 py-4 align-top">
                          <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                              <Route className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-950">{trip.title}</p>
                              <p className="mt-1 text-xs text-slate-400">Budget {currencyFormatter.format(trip.budget)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 align-top text-sm font-semibold text-slate-700">{trip.hostName}</td>
                        <td className="px-3 py-4 align-top">
                          <div className="flex items-start gap-2 text-sm text-slate-600">
                            <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
                            <span>{trip.destination}</span>
                          </div>
                        </td>
                        <td className="px-3 py-4 align-top">
                          <span className={`inline-flex rounded-2xl px-3 py-1 text-xs font-semibold ring-1 ${getStatusStyles(trip.status)}`}>
                            {trip.status}
                          </span>
                        </td>
                        <td className="px-3 py-4 align-top text-sm text-slate-500">{formatSingleDate(trip.startDate)}</td>
                        <td className="px-3 py-4 align-top text-sm text-slate-500">{formatSingleDate(trip.endDate)}</td>
                        <td className="rounded-r-3xl px-3 py-4 align-top">
                          <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                            <Users className="h-4 w-4 text-slate-400" />
                            {trip.participantCount}/{trip.maxParticipants}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default AdminTripsView;
