import { buildApiUrl } from './apiBaseUrl';

export type TripSuggestion = {
  id: string;
  name: string;
  whyVisit: string;
  estimatedCostPerPerson: number;
  vibeMatchPercent: number;
  imageUrl: string;
  voteCount: number;
  votePercent: number;
  hasVoted: boolean;
  isLeader: boolean;
  isWinningSuggestion: boolean;
  voteRoom: {
    id: string;
    status: 'open' | 'decided';
    votedCount: number;
    requiredVotes: number;
    decisionMadeAt: string | null;
  } | null;
};

export type TripSuggestionPreferences = {
  collectiveMood: string;
  interest: string;
  budget: string;
  food: string;
  crowds: string;
};

export type TripSuggestionsSummary = {
  tripId: string;
  title: string;
  destination: string;
  travelerType: string;
  totalTravelers: number;
  generatedPreferences: TripSuggestionPreferences | null;
  generatedAt: string | null;
  suggestions: TripSuggestion[];
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
    throw new Error('Unable to connect to the trip suggestions API.');
  }

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as T;
};

const parseSuggestionEventData = (rawValue: string): TripSuggestionsSummary | null => {
  try {
    return JSON.parse(rawValue) as TripSuggestionsSummary;
  } catch {
    return null;
  }
};

const delay = (durationMs: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });

export const fetchTripSuggestions = async (tripId: string, authToken: string): Promise<TripSuggestionsSummary> =>
  request<TripSuggestionsSummary>(`/api/trips/${encodeURIComponent(tripId)}/suggestions`, { method: 'GET' }, authToken);

export const getSmartSuggestions = fetchTripSuggestions;

export const generateTripSuggestions = async (
  tripId: string,
  userPreferences: TripSuggestionPreferences,
  authToken: string,
): Promise<TripSuggestionsSummary> =>
  request<TripSuggestionsSummary>(
    `/api/trips/${encodeURIComponent(tripId)}/generate-suggestions`,
    {
      method: 'POST',
      body: JSON.stringify({ userPreferences }),
    },
    authToken,
  );

export const voteForTripSuggestion = async (
  tripId: string,
  suggestionId: string,
  authToken: string,
): Promise<TripSuggestionsSummary> =>
  request<TripSuggestionsSummary>(
    `/api/trips/${encodeURIComponent(tripId)}/suggestions/${encodeURIComponent(suggestionId)}/vote`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
    authToken,
  );

export const resetTripSuggestions = async (tripId: string, authToken: string): Promise<TripSuggestionsSummary> =>
  request<TripSuggestionsSummary>(
    `/api/trips/${encodeURIComponent(tripId)}/suggestions`,
    {
      method: 'DELETE',
    },
    authToken,
  );

export const subscribeToTripSuggestions = (
  tripId: string,
  authToken: string,
  onUpdate: (summary: TripSuggestionsSummary) => void,
  onError?: (error: Error) => void,
): (() => void) => {
  const abortController = new AbortController();

  const connect = async (): Promise<void> => {
    while (!abortController.signal.aborted) {
      try {
        const response = await fetch(buildUrl(`/api/trips/${encodeURIComponent(tripId)}/suggestions/stream`), {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(await parseErrorMessage(response));
        }

        if (!response.body) {
          throw new Error('Live updates are not available right now.');
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

          if (currentEventName === 'suggestions') {
            const payload = parseSuggestionEventData(currentDataLines.join('\n'));
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

        onError?.(error instanceof Error ? error : new Error('Live trip voting disconnected.'));
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
