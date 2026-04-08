import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import UserTable from '../components/UserTable';
import {
  blockUserAccount,
  deleteUserAccount,
  fetchAdminStats,
  fetchAdminUsers,
  rejectPendingUser,
  unblockUserAccount,
  verifyPendingUser,
  type AdminStats,
  type AdminUserFilter,
  type AdminUserRecord,
} from '../services/adminApi';

type AdminUsersViewProps = {
  authToken: string;
  activeFilter: AdminUserFilter;
  onBackToDashboard: () => void;
  onFilterChange: (filter: AdminUserFilter) => void;
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

const FILTER_COPY: Record<AdminUserFilter, { title: string; description: string }> = {
  all: {
    title: 'All Users',
    description: 'Every active account currently in the platform.',
  },
  pending: {
    title: 'Pending Verification',
    description: 'Accounts waiting for an admin decision on uploaded identity documents.',
  },
  verified: {
    title: 'Verified Users',
    description: 'Approved accounts with successful document verification.',
  },
  blocked: {
    title: 'Blocked Users',
    description: 'Accounts that are currently restricted from using the platform.',
  },
  deleted: {
    title: 'Deleted Users',
    description: 'Audit snapshots of accounts removed by an administrator.',
  },
};

const MIN_REFRESH_OVERLAY_MS = 300;

function AdminUsersView({ authToken, activeFilter, onBackToDashboard, onFilterChange }: AdminUsersViewProps) {
  const [stats, setStats] = useState<AdminStats>(EMPTY_ADMIN_STATS);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [selectedRejectedUser, setSelectedRejectedUser] = useState<AdminUserRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectSubmitting, setIsRejectSubmitting] = useState(false);
  const [activeDeleteUserId, setActiveDeleteUserId] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);
  const refreshStartedAtRef = useRef<number | null>(null);
  const refreshTimeoutRef = useRef<number | null>(null);

  const loadUsersView = async (filter: AdminUserFilter, showLoader = true) => {
    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    if (showLoader) {
      setIsLoading(true);
    } else if (hasLoadedOnceRef.current) {
      refreshStartedAtRef.current = Date.now();
      setIsRefreshing(true);
    }

    try {
      const [nextStats, nextUsers] = await Promise.all([fetchAdminStats(authToken), fetchAdminUsers(filter, authToken)]);
      setStats(nextStats);
      setUsers(nextUsers);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load the admin user list.');
    } finally {
      hasLoadedOnceRef.current = true;
      if (showLoader) {
        setIsLoading(false);
      } else if (refreshStartedAtRef.current) {
        const elapsed = Date.now() - refreshStartedAtRef.current;
        const remaining = Math.max(MIN_REFRESH_OVERLAY_MS - elapsed, 0);

        refreshTimeoutRef.current = window.setTimeout(() => {
          setIsRefreshing(false);
          refreshTimeoutRef.current = null;
        }, remaining);
        refreshStartedAtRef.current = null;
        return;
      }
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadUsersView(activeFilter, !hasLoadedOnceRef.current);
  }, [activeFilter, authToken]);

  useEffect(() => {
    if (!actionMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setActionMessage(null);
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [actionMessage]);

  useEffect(
    () => () => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }
    },
    [],
  );

  const filterButtons = useMemo(
    () => [
      { key: 'all', label: 'Total Users', count: stats.totalUsers },
      { key: 'pending', label: 'Pending', count: stats.totalPendingUsers },
      { key: 'verified', label: 'Verified', count: stats.totalVerifiedUsers },
      { key: 'blocked', label: 'Blocked', count: stats.totalBlockedUsers },
      { key: 'deleted', label: 'Deleted', count: stats.totalDeletedUsers },
    ] as Array<{ key: AdminUserFilter; label: string; count: number }>,
    [stats],
  );

  const handleVerify = async (user: AdminUserRecord) => {
    if (activeUserId || isRejectSubmitting || user.isDeleted) {
      return;
    }

    setActiveUserId(user.id);
    setActionMessage(null);

    try {
      const response = await verifyPendingUser(user.id, authToken);
      setActionMessage(response.message);
      await loadUsersView(activeFilter, false);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Unable to verify this user right now.');
    } finally {
      setActiveUserId(null);
    }
  };

  const handleOpenRejectModal = (user: AdminUserRecord) => {
    if (activeUserId || isRejectSubmitting || user.isDeleted) {
      return;
    }

    setSelectedRejectedUser(user);
    setRejectionReason(user.rejectionReason ?? '');
    setActionMessage(null);
  };

  const handleCloseRejectModal = () => {
    if (isRejectSubmitting) {
      return;
    }

    setSelectedRejectedUser(null);
    setRejectionReason('');
  };

  const handleRejectSubmit = async () => {
    if (!selectedRejectedUser || !rejectionReason.trim() || isRejectSubmitting) {
      return;
    }

    setIsRejectSubmitting(true);
    setActionMessage(null);

    try {
      const response = await rejectPendingUser(selectedRejectedUser.id, rejectionReason.trim(), authToken);
      setActionMessage(response.message);
      setSelectedRejectedUser(null);
      setRejectionReason('');
      await loadUsersView(activeFilter, false);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Unable to reject this user right now.');
    } finally {
      setIsRejectSubmitting(false);
    }
  };

  const handleBlockToggle = async (user: AdminUserRecord) => {
    if (activeUserId || isRejectSubmitting || activeDeleteUserId || user.isDeleted) {
      return;
    }

    setActiveUserId(user.id);
    setActionMessage(null);

    try {
      if (user.isBlocked) {
        const response = await unblockUserAccount(user.id, authToken);
        setActionMessage(response.message);
      } else {
        const reason = window.prompt('Enter a block reason for this account:', user.blockedReason ?? 'Blocked by administrator.');
        if (reason === null) {
          setActiveUserId(null);
          return;
        }

        const response = await blockUserAccount(user.id, reason.trim() || 'Blocked by administrator.', authToken);
        setActionMessage(response.message);
      }

      await loadUsersView(activeFilter, false);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Unable to update this account right now.');
    } finally {
      setActiveUserId(null);
    }
  };

  const handleDeleteUser = async (user: AdminUserRecord) => {
    if (activeUserId || isRejectSubmitting || activeDeleteUserId || user.isDeleted) {
      return;
    }

    const shouldDelete = window.confirm(
      `Delete ${user.name}'s account? This will remove the user and clean up their related records.`,
    );
    if (!shouldDelete) {
      return;
    }

    setActiveDeleteUserId(user.id);
    setActionMessage(null);

    try {
      const response = await deleteUserAccount(user.id, authToken);
      setActionMessage(response.message);
      await loadUsersView(activeFilter, false);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Unable to delete this user right now.');
    } finally {
      setActiveDeleteUserId(null);
    }
  };

  const emptyCopy = FILTER_COPY[activeFilter];

  return (
    <section className="mx-auto w-full max-w-7xl px-6 pb-16 pt-8">
      <div className="rounded-[2rem] border border-slate-200/80 bg-white/80 p-6 shadow-[0_32px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <button
              type="button"
              onClick={onBackToDashboard}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </button>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Admin User Directory</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">{emptyCopy.title}</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">{emptyCopy.description}</p>
          </div>

          <div className="rounded-3xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800">
            <p className="font-semibold">Live moderation controls</p>
            <p className="mt-1">Search, sort, verify, block, or delete directly from this view.</p>
          </div>
        </div>

        {errorMessage ? (
          <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        {actionMessage ? (
          <p className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-700">
            {actionMessage}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          {filterButtons.map((button) => (
            <button
              key={button.key}
              type="button"
              onClick={() => onFilterChange(button.key)}
              className={
                activeFilter === button.key
                  ? 'rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm'
                  : 'rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
              }
            >
              {button.label} ({button.count})
            </button>
          ))}
        </div>

        {activeFilter === 'deleted' ? (
          <div className="mt-6 flex items-start gap-3 rounded-3xl border border-violet-100 bg-violet-50/80 px-4 py-4 text-sm text-violet-800">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <p>Deleted records are audit snapshots. They stay searchable here, but they no longer support live actions.</p>
          </div>
        ) : null}

        <div className="relative mt-6">
          <UserTable
            users={users}
            isLoading={isLoading}
            emptyTitle={`No ${emptyCopy.title.toLowerCase()} found.`}
            emptyDescription={emptyCopy.description}
            activeUserId={activeUserId}
            activeDeleteUserId={activeDeleteUserId}
            isRejectSubmitting={isRejectSubmitting}
            selectedRejectedUserId={selectedRejectedUser?.id ?? null}
            onVerify={handleVerify}
            onReject={handleOpenRejectModal}
            onToggleBlock={handleBlockToggle}
            onDelete={handleDeleteUser}
          />

          {isRefreshing && !isLoading ? (
            <div className="pointer-events-none absolute inset-0 z-10 rounded-3xl bg-white/45 backdrop-blur-[1px]">
              <div className="flex h-full items-start justify-end p-4">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-sky-100 bg-white/90 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700 shadow-sm">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-sky-500" />
                  Updating
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {selectedRejectedUser ? (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Reject Verification</p>
            <h3 className="mt-2 text-2xl font-black text-slate-950">{selectedRejectedUser.name}</h3>
            <p className="mt-2 text-sm text-slate-500">
              Enter a short reason. This will be sent to the user as a verification notification.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {['Document blurry', 'Invalid ID', 'Name mismatch'].map((reasonOption) => (
                <button
                  key={reasonOption}
                  type="button"
                  onClick={() => setRejectionReason(reasonOption)}
                  disabled={isRejectSubmitting}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                >
                  {reasonOption}
                </button>
              ))}
            </div>

            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-semibold text-slate-900">Reason</span>
              <textarea
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                rows={4}
                maxLength={240}
                disabled={isRejectSubmitting}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                placeholder="Explain why the document could not be approved."
              />
              <span className="mt-1 block text-right text-xs text-slate-400">{rejectionReason.trim().length}/240</span>
            </label>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseRejectModal}
                disabled={isRejectSubmitting}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleRejectSubmit()}
                disabled={!rejectionReason.trim() || isRejectSubmitting}
                className="rounded-2xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRejectSubmitting ? 'Sending...' : 'Send Rejection'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default AdminUsersView;
