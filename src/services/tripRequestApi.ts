const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? '';

export type JoinRequestStatus = 'pending' | 'accepted' | 'rejected';
export type RequestSource = 'api' | 'local';

export type HostTripSummary = {
  id: string;
  hostId: string;
  maxParticipants?: number;
  spotsFilled?: number;
  spotsFilledPercent?: number;
  participantIds?: string[];
  pendingRequestCount: number;
};

export type HostTripRequest = {
  id: string;
  tripId: string;
  requesterId: string;
  requesterLabel: string;
  status: JoinRequestStatus;
  createdAt: string;
  source: RequestSource;
};

type SelfTripsResponse = {
  trips: Array<{
    id: string;
    hostId: string;
    maxParticipants?: number;
    spotsFilled?: number;
    spotsFilledPercent?: number;
    participantIds?: string[];
    pendingRequestCount: number;
  }>;
};

type TripRequestsResponse = {
  requests: Array<{
    id: string;
    tripId: string;
    requesterId: string;
    requesterLabel?: string;
    status: JoinRequestStatus;
    createdAt: string;
  }>;
};

type JoinRequestResponse = {
  request: {
    id: string;
    tripId: string;
    requesterId: string;
    status: JoinRequestStatus;
    createdAt?: string;
  };
};

type ReviewJoinRequestResponse = {
  request: {
    id: string;
    tripId: string;
    requesterId: string;
    hostId: string;
    status: JoinRequestStatus;
    updatedAt?: string;
  };
  trip?: {
    id: string;
    hostId: string;
    maxParticipants: number;
    spotsFilled: number;
    spotsFilledPercent: number;
    participantIds: string[];
  };
};

const buildUrl = (path: string) => `${API_BASE_URL}${path}`;

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

const request = async <T>(path: string, init: RequestInit = {}, authToken?: string): Promise<T> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let response: Response;

  try {
    response = await fetch(buildUrl(path), {
      ...init,
      headers,
    });
  } catch {
    throw new Error('Unable to connect to the trip request API.');
  }

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new Error(message);
  }

  return (await response.json()) as T;
};

export const fetchSelfTrips = async (authToken: string): Promise<HostTripSummary[]> => {
  const response = await request<SelfTripsResponse>(
    '/api/trips/self',
    {
      method: 'GET',
    },
    authToken,
  );

  return response.trips.map((trip) => ({
    id: trip.id,
    hostId: trip.hostId,
    maxParticipants: trip.maxParticipants,
    spotsFilled: trip.spotsFilled,
    spotsFilledPercent: trip.spotsFilledPercent,
    participantIds: trip.participantIds,
    pendingRequestCount: trip.pendingRequestCount ?? 0,
  }));
};

export const fetchTripRequests = async (tripId: string, authToken: string): Promise<HostTripRequest[]> => {
  const response = await request<TripRequestsResponse>(
    `/api/trips/${encodeURIComponent(tripId)}/requests?status=pending`,
    {
      method: 'GET',
    },
    authToken,
  );

  return response.requests.map((requestItem) => ({
    id: requestItem.id,
    tripId: requestItem.tripId,
    requesterId: requestItem.requesterId,
    requesterLabel: requestItem.requesterLabel ?? `Traveler ${requestItem.requesterId.slice(-6)}`,
    status: requestItem.status,
    createdAt: requestItem.createdAt,
    source: 'api',
  }));
};

export const submitJoinRequest = async (tripId: string, authToken: string): Promise<JoinRequestResponse['request']> => {
  const response = await request<JoinRequestResponse>(
    `/api/trips/${encodeURIComponent(tripId)}/join`,
    {
      method: 'POST',
    },
    authToken,
  );

  return response.request;
};

export const reviewJoinRequest = async (
  requestId: string,
  status: Extract<JoinRequestStatus, 'accepted' | 'rejected'>,
  authToken: string,
): Promise<ReviewJoinRequestResponse> => {
  return request<ReviewJoinRequestResponse>(
    `/api/join-requests/${encodeURIComponent(requestId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
    authToken,
  );
};
