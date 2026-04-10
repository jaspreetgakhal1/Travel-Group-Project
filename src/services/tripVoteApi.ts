import { buildApiUrl } from './apiBaseUrl';

export type VoteRoomStatus = 'open' | 'decided' | 'archived';
export type VoteDecisionMode = 'majority' | 'host_closed' | null;

export type TripVoteMember = {
  id: string;
  name: string;
  avatar: string | null;
  isHost: boolean;
  hasVoted: boolean;
};

export type TripVoteSession = {
  id: string;
  trip: {
    id: string;
    title: string;
    location: string;
    imageUrl: string;
  };
  placeName: string;
  description: string;
  estimatedCost: number;
  imageUrl: string;
  status: VoteRoomStatus;
  votedCount: number;
  totalMembers: number;
  requiredVotes: number;
  majorityReached: boolean;
  hasViewerVoted: boolean;
  isViewerHost: boolean;
  decisionMode: VoteDecisionMode;
  decisionMadeAt: string | null;
  createdAt: string;
  members: TripVoteMember[];
};

export type TripLatestDecisionResponse = {
  decision: TripVoteSession | null;
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

const request = async <T>(path: string, init: RequestInit, authToken: string): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(buildUrl(path), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new Error('Unable to connect to the trip voting API.');
  }

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as T;
};

const parseVoteSessionEventData = (rawValue: string): TripVoteSession | null => {
  try {
    return JSON.parse(rawValue) as TripVoteSession;
  } catch {
    return null;
  }
};

const delay = (durationMs: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });

export const createTripVoteSession = async (
  tripId: string,
  payload: {
    suggestionId: string;
    placeName: string;
    description: string;
    estimatedCost: number;
    imageUrl: string;
  },
  authToken: string,
): Promise<TripVoteSession> =>
  request<TripVoteSession>(
    `/api/trips/${encodeURIComponent(tripId)}/votes`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    authToken,
  );

export const fetchTripVoteSession = async (
  tripId: string,
  voteId: string,
  authToken: string,
): Promise<TripVoteSession> =>
  request<TripVoteSession>(
    `/api/trips/${encodeURIComponent(tripId)}/votes/${encodeURIComponent(voteId)}`,
    { method: 'GET' },
    authToken,
  );

export const castTripVote = async (
  tripId: string,
  voteId: string,
  authToken: string,
): Promise<TripVoteSession> =>
  request<TripVoteSession>(
    `/api/trips/${encodeURIComponent(tripId)}/votes/${encodeURIComponent(voteId)}/cast`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
    authToken,
  );

export const closeTripVoteSession = async (
  tripId: string,
  voteId: string,
  authToken: string,
): Promise<TripVoteSession> =>
  request<TripVoteSession>(
    `/api/trips/${encodeURIComponent(tripId)}/votes/${encodeURIComponent(voteId)}/close`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
    authToken,
  );

export const fetchLatestTripDecision = async (tripId: string, authToken: string): Promise<TripVoteSession | null> => {
  const response = await request<TripLatestDecisionResponse>(
    `/api/trips/${encodeURIComponent(tripId)}/votes/latest-decision`,
    { method: 'GET' },
    authToken,
  );

  return response.decision;
};

export const subscribeToTripVoteSession = (
  tripId: string,
  voteId: string,
  authToken: string,
  onUpdate: (session: TripVoteSession) => void,
  onError?: (error: Error) => void,
): (() => void) => {
  const abortController = new AbortController();

  const connect = async (): Promise<void> => {
    while (!abortController.signal.aborted) {
      try {
        const response = await fetch(
          buildUrl(`/api/trips/${encodeURIComponent(tripId)}/votes/${encodeURIComponent(voteId)}/stream`),
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
            signal: abortController.signal,
          },
        );

        if (!response.ok) {
          throw new Error(await parseErrorMessage(response));
        }

        if (!response.body) {
          throw new Error('Live vote-room updates are not available right now.');
        }

        const reader = response.body.getReader();
        const textDecoder = new TextDecoder();
        let buffer = '';
        let currentEventName = 'message';
        let currentDataLines: string[] = [];

        const flushEvent = () => {
          if (!currentDataLines.length) {
            currentEventName = 'message';
            return;
          }

          if (currentEventName === 'vote-session') {
            const payload = parseVoteSessionEventData(currentDataLines.join('\n'));
            if (payload) {
              onUpdate(payload);
            }
          }

          currentEventName = 'message';
          currentDataLines = [];
        };

        while (!abortController.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += textDecoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (line === '') {
              flushEvent();
              continue;
            }

            if (line.startsWith('event:')) {
              currentEventName = line.slice('event:'.length).trim() || 'message';
              continue;
            }

            if (line.startsWith('data:')) {
              currentDataLines.push(line.slice('data:'.length).trimStart());
            }
          }
        }

        if (buffer.trim()) {
          currentDataLines.push(buffer.trim());
          flushEvent();
        }
      } catch (error) {
        if (abortController.signal.aborted) {
          break;
        }

        onError?.(error instanceof Error ? error : new Error('Live vote-room updates disconnected.'));
      }

      if (!abortController.signal.aborted) {
        await delay(3000);
      }
    }
  };

  void connect();

  return () => {
    abortController.abort();
  };
};
