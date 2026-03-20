// Added by Codex: project documentation comment for src\services\matchApi.ts
import { normalizeTravelDNA, type TravelDNA } from '../models/dnaModel';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? '';

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

export type TripDNAMatch = {
  tripId: string;
  matchPercentage: number;
  organizerName: string;
  viewerDNA: TravelDNA;
  organizerDNA: TravelDNA;
  conflictHint: string;
};

export const fetchTripDNAMatch = async (tripId: string, authToken: string): Promise<TripDNAMatch> => {
  let response: Response;

  try {
    response = await fetch(buildUrl(`/api/match/${encodeURIComponent(tripId)}`), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  } catch {
    throw new Error('Unable to connect to the DNA match API. Check that the server is running.');
  }

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new Error(message);
  }

  const payload = (await response.json()) as {
    tripId: string;
    matchPercentage: number;
    organizerName?: string;
    viewerDNA: Partial<TravelDNA> | null;
    organizerDNA: Partial<TravelDNA> | null;
    conflictHint?: string;
  };

  return {
    tripId: payload.tripId,
    matchPercentage: Number.isFinite(payload.matchPercentage) ? Math.max(0, Math.min(100, Math.round(payload.matchPercentage))) : 0,
    organizerName: typeof payload.organizerName === 'string' && payload.organizerName.trim() ? payload.organizerName.trim() : 'Organizer',
    viewerDNA: normalizeTravelDNA(payload.viewerDNA),
    organizerDNA: normalizeTravelDNA(payload.organizerDNA),
    conflictHint:
      typeof payload.conflictHint === 'string' && payload.conflictHint.trim()
        ? payload.conflictHint.trim()
        : 'Travel vibe difference detected.',
  };
};

