import { buildApiUrl } from './apiBaseUrl';

type DashboardRequestOptions = {
  authToken: string;
};

export type PendingDashboardRequest = {
  id: string;
  tripId: string;
  tripTitle: string;
  requesterId: string;
  requesterName: string;
  requesterAvatar: string | null;
  requestedAt: string;
};

export type DashboardBuddy = {
  id: string;
  name: string;
  profileImageDataUrl: string | null;
};

export type DashboardTripSummary = {
  id: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  imageUrl: string | null;
};

export type DashboardStats = {
  activeTripsCount: number;
  pendingRequests: number;
  totalParticipants: number;
  upcomingDestination: string | null;
  upcomingTrip: DashboardTripSummary | null;
  pendingRequestItems: PendingDashboardRequest[];
  activeTripBuddies: DashboardBuddy[];
  completedTripsCount: number;
  upcomingTripsCount: number;
  totalTripsCount: number;
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

const request = async <T>(path: string, options: DashboardRequestOptions): Promise<T> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${options.authToken}`,
  };

  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method: 'GET',
      headers,
    });
  } catch {
    throw new Error('Unable to connect to the dashboard API. Check that the server is running.');
  }

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new Error(message);
  }

  return (await response.json()) as T;
};

export const fetchDashboardStats = async (authToken: string): Promise<DashboardStats> =>
  request<DashboardStats>('/api/users/dashboard-stats', {
    authToken,
  });
