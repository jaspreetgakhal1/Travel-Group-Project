import { buildApiUrl } from './apiBaseUrl';

export type AdminUserFilter = 'all' | 'pending' | 'verified' | 'blocked' | 'deleted';

export type AdminTripLifecycle = {
  completed: number;
  active: number;
  pending: number;
  cancelled: number;
};

export type AdminTripRecord = {
  id: string;
  title: string;
  destination: string;
  hostName: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  startDate: string | null;
  endDate: string | null;
  budget: number;
  maxParticipants: number;
  participantCount: number;
  createdAt: string | null;
};

export type AdminStats = {
  totalUsers: number;
  totalVerifiedUsers: number;
  totalPendingUsers: number;
  totalBlockedUsers: number;
  totalDeletedUsers: number;
  totalCompletedTrips: number;
  totalPendingTrips: number;
  totalTrips: number;
  grossTripTotal: number;
  successRate: number;
  tripLifecycle: AdminTripLifecycle;
  dateRange: {
    from: string | null;
    to: string | null;
  };
};

export type AdminUserRecord = {
  id: string;
  originalUserId?: string | null;
  userId: string;
  name: string;
  email: string;
  mobileNumber: string | null;
  profileImageDataUrl: string | null;
  isBlocked: boolean;
  blockedAt: string | null;
  blockedReason: string | null;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verificationDocumentUrl: string | null;
  verificationDocumentName: string | null;
  verificationDocumentMimeType: string | null;
  verificationUploadedAt: string | null;
  rejectionReason: string | null;
  createdAt: string | null;
  deletedAt: string | null;
  isDeleted: boolean;
};

export type PendingVerificationUser = AdminUserRecord;

type AdminUsersResponse = {
  users: AdminUserRecord[];
};

type AdminTripsResponse = {
  trips: AdminTripRecord[];
  dateRange: {
    from: string | null;
    to: string | null;
  };
};

type VerifyUserResponse = {
  message: string;
  user: {
    id: string;
    verificationStatus: 'verified' | 'rejected' | 'pending';
    rejectionReason?: string | null;
    isBlocked?: boolean;
    blockedReason?: string | null;
  };
};

type DeleteUserResponse = {
  message: string;
  user: {
    id: string;
  };
};

type AdminDateRange = {
  from?: string;
  to?: string;
};

const buildUrl = (path: string) => buildApiUrl(path);

const parseErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as { message?: string };
    if (payload.message) {
      return payload.message;
    }
  } catch {
    return 'Request failed.';
  }

  return 'Request failed.';
};

const request = async <T>(path: string, authToken: string, init: RequestInit = {}): Promise<T> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
    ...(init.headers as Record<string, string> | undefined),
  };

  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      ...init,
      headers,
    });
  } catch {
    throw new Error('Unable to connect to the admin API. Check that the server is running.');
  }

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as T;
};

const buildDateRangeQuery = (dateRange?: AdminDateRange): string => {
  const params = new URLSearchParams();

  if (dateRange?.from) {
    params.set('from', dateRange.from);
  }

  if (dateRange?.to) {
    params.set('to', dateRange.to);
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
};

export const fetchAdminStats = async (authToken: string, dateRange?: AdminDateRange): Promise<AdminStats> =>
  request<AdminStats>(`/api/admin/stats${buildDateRangeQuery(dateRange)}`, authToken, {
    method: 'GET',
  });

export const fetchPendingVerificationUsers = async (
  authToken: string,
  options?: { limit?: number },
): Promise<PendingVerificationUser[]> => {
  const params = new URLSearchParams();

  if (typeof options?.limit === 'number' && Number.isFinite(options.limit) && options.limit > 0) {
    params.set('limit', String(Math.trunc(options.limit)));
  }

  const queryString = params.toString();
  const response = await request<AdminUsersResponse>(
    `/api/admin/pending-users${queryString ? `?${queryString}` : ''}`,
    authToken,
    {
      method: 'GET',
    },
  );

  return response.users;
};

export const fetchAdminUsers = async (filter: AdminUserFilter, authToken: string): Promise<AdminUserRecord[]> => {
  const response = await request<AdminUsersResponse>(`/api/admin/users?status=${encodeURIComponent(filter)}`, authToken, {
    method: 'GET',
  });

  return response.users;
};

export const fetchAdminTrips = async (authToken: string, dateRange?: AdminDateRange): Promise<AdminTripRecord[]> => {
  const response = await request<AdminTripsResponse>(`/api/admin/trips${buildDateRangeQuery(dateRange)}`, authToken, {
    method: 'GET',
  });

  return response.trips;
};

export const verifyPendingUser = async (userId: string, authToken: string): Promise<VerifyUserResponse> =>
  request<VerifyUserResponse>(`/api/admin/verify-user/${encodeURIComponent(userId)}`, authToken, {
    method: 'POST',
  });

export const rejectPendingUser = async (
  userId: string,
  reason: string,
  authToken: string,
): Promise<VerifyUserResponse> =>
  request<VerifyUserResponse>(`/api/admin/reject-user/${encodeURIComponent(userId)}`, authToken, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });

export const blockUserAccount = async (
  userId: string,
  reason: string,
  authToken: string,
): Promise<VerifyUserResponse> =>
  request<VerifyUserResponse>(`/api/admin/block-user/${encodeURIComponent(userId)}`, authToken, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });

export const unblockUserAccount = async (userId: string, authToken: string): Promise<VerifyUserResponse> =>
  request<VerifyUserResponse>(`/api/admin/unblock-user/${encodeURIComponent(userId)}`, authToken, {
    method: 'POST',
  });

export const deleteUserAccount = async (userId: string, authToken: string): Promise<DeleteUserResponse> =>
  request<DeleteUserResponse>(`/api/admin/user/${encodeURIComponent(userId)}`, authToken, {
    method: 'DELETE',
  });
