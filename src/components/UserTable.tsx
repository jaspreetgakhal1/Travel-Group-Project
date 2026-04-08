import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Search } from 'lucide-react';
import type { AdminUserRecord } from '../services/adminApi';

type UserTableProps = {
  users: AdminUserRecord[];
  isLoading?: boolean;
  emptyTitle: string;
  emptyDescription: string;
  activeUserId?: string | null;
  activeDeleteUserId?: string | null;
  isRejectSubmitting?: boolean;
  selectedRejectedUserId?: string | null;
  onVerify?: (user: AdminUserRecord) => void;
  onReject?: (user: AdminUserRecord) => void;
  onToggleBlock?: (user: AdminUserRecord) => void;
  onDelete?: (user: AdminUserRecord) => void;
};

type SortField = 'createdAt' | 'verificationUploadedAt';
type SortDirection = 'asc' | 'desc';

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

const getTimestamp = (value: string | null): number => {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? Number.NEGATIVE_INFINITY : parsed.getTime();
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

const getStatusMeta = (user: AdminUserRecord): { label: string; className: string } => {
  if (user.isDeleted) {
    return {
      label: 'Deleted',
      className: 'bg-slate-100 text-slate-700 ring-slate-200',
    };
  }

  if (user.isBlocked) {
    return {
      label: 'Blocked',
      className: 'bg-rose-50 text-rose-700 ring-rose-200',
    };
  }

  if (user.verificationStatus === 'verified') {
    return {
      label: 'Verified',
      className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    };
  }

  if (user.verificationStatus === 'rejected') {
    return {
      label: 'Rejected',
      className: 'bg-violet-50 text-violet-700 ring-violet-200',
    };
  }

  return {
    label: 'Pending',
    className: 'bg-amber-50 text-amber-700 ring-amber-200',
  };
};

function UserTable({
  users,
  isLoading = false,
  emptyTitle,
  emptyDescription,
  activeUserId = null,
  activeDeleteUserId = null,
  isRejectSubmitting = false,
  selectedRejectedUserId = null,
  onVerify,
  onReject,
  onToggleBlock,
  onDelete,
}: UserTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const visibleUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filteredUsers = normalizedSearch
      ? users.filter((user) =>
          [user.name, user.email]
            .join(' ')
            .toLowerCase()
            .includes(normalizedSearch),
        )
      : users;

    return [...filteredUsers].sort((leftUser, rightUser) => {
      const leftValue = getTimestamp(sortField === 'createdAt' ? leftUser.createdAt : leftUser.verificationUploadedAt);
      const rightValue = getTimestamp(sortField === 'createdAt' ? rightUser.createdAt : rightUser.verificationUploadedAt);

      if (leftValue === rightValue) {
        const fallbackCompare = leftUser.name.localeCompare(rightUser.name, undefined, {
          sensitivity: 'base',
        });
        return sortDirection === 'asc' ? fallbackCompare : fallbackCompare * -1;
      }

      return sortDirection === 'asc' ? leftValue - rightValue : rightValue - leftValue;
    });
  }, [searchTerm, sortDirection, sortField, users]);

  const handleSortChange = (nextField: SortField) => {
    if (sortField === nextField) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(nextField);
    setSortDirection('desc');
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }

    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-11 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300"
            placeholder="Search by name or email"
          />
        </label>

        <p className="text-sm text-slate-500">{visibleUsers.length} matching users</p>
      </div>

      {isLoading ? (
        <p className="py-12 text-sm font-medium text-slate-500">Loading users...</p>
      ) : visibleUsers.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-lg font-semibold text-slate-900">{emptyTitle}</p>
          <p className="mt-2 text-sm text-slate-500">{emptyDescription}</p>
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-3">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <th className="px-3 pb-1">User</th>
                <th className="px-3 pb-1">Status</th>
                <th className="px-3 pb-1">
                  <button
                    type="button"
                    onClick={() => handleSortChange('createdAt')}
                    className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 transition hover:text-slate-600"
                  >
                    Join Date
                    {renderSortIcon('createdAt')}
                  </button>
                </th>
                <th className="px-3 pb-1">
                  <button
                    type="button"
                    onClick={() => handleSortChange('verificationUploadedAt')}
                    className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 transition hover:text-slate-600"
                  >
                    Verification Date
                    {renderSortIcon('verificationUploadedAt')}
                  </button>
                </th>
                <th className="px-3 pb-1">Document</th>
                <th className="px-3 pb-1 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((user) => {
                const statusMeta = getStatusMeta(user);
                const isBusy =
                  activeUserId === user.id ||
                  activeDeleteUserId === user.id ||
                  (isRejectSubmitting && selectedRejectedUserId === user.id);
                const canReview = !user.isDeleted && user.verificationStatus === 'pending';

                return (
                  <tr key={user.id} className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
                    <td className="rounded-l-3xl px-3 py-4 align-top">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-sky-100 text-sm font-bold text-sky-700">
                          {user.profileImageDataUrl ? (
                            <img src={user.profileImageDataUrl} alt={user.name} className="h-full w-full object-cover" />
                          ) : (
                            <span>{getUserInitials(user.name)}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{user.name}</p>
                          <p className="text-sm text-slate-500">{user.email || user.userId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 align-top">
                      <span className={`inline-flex rounded-2xl px-3 py-1 text-xs font-semibold ring-1 ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                      {user.rejectionReason ? (
                        <p className="mt-2 max-w-[220px] text-xs text-violet-700">{user.rejectionReason}</p>
                      ) : null}
                      {user.blockedReason && !user.isDeleted ? (
                        <p className="mt-2 max-w-[220px] text-xs text-rose-700">{user.blockedReason}</p>
                      ) : null}
                      {user.deletedAt ? (
                        <p className="mt-2 max-w-[220px] text-xs text-slate-500">Deleted {formatDateTime(user.deletedAt)}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-4 align-top text-sm text-slate-500">{formatDateTime(user.createdAt)}</td>
                    <td className="px-3 py-4 align-top text-sm text-slate-500">{formatDateTime(user.verificationUploadedAt)}</td>
                    <td className="px-3 py-4 align-top">
                      {user.verificationDocumentUrl ? (
                        <a
                          href={user.verificationDocumentUrl}
                          download={user.verificationDocumentName ?? `${user.userId}-document`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </a>
                      ) : (
                        <span className="text-sm text-slate-400">
                          {user.isDeleted ? 'Removed with account' : 'Unavailable'}
                        </span>
                      )}
                    </td>
                    <td className="rounded-r-3xl px-3 py-4 align-top">
                      <div className="flex justify-end gap-2">
                        {canReview && onVerify ? (
                          <button
                            type="button"
                            onClick={() => onVerify(user)}
                            disabled={isBusy}
                            className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {activeUserId === user.id ? 'Verifying...' : 'Verify'}
                          </button>
                        ) : null}
                        {canReview && onReject ? (
                          <button
                            type="button"
                            onClick={() => onReject(user)}
                            disabled={isBusy}
                            className="rounded-2xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Reject
                          </button>
                        ) : null}
                        {!user.isDeleted && onToggleBlock ? (
                          <button
                            type="button"
                            onClick={() => onToggleBlock(user)}
                            disabled={isBusy}
                            className={
                              user.isBlocked
                                ? 'rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'
                                : 'rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
                            }
                          >
                            {activeUserId === user.id ? 'Saving...' : user.isBlocked ? 'Unblock' : 'Block'}
                          </button>
                        ) : null}
                        {!user.isDeleted && onDelete ? (
                          <button
                            type="button"
                            onClick={() => onDelete(user)}
                            disabled={isBusy}
                            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {activeDeleteUserId === user.id ? 'Deleting...' : 'Delete'}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default UserTable;
