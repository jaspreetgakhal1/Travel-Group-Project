const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? '';

const buildUrl = (path: string) => `${API_BASE_URL}${path}`;

export const checkTripChatAccess = async (tripId: string, authToken: string): Promise<boolean> => {
  if (!tripId || !authToken) {
    return false;
  }

  let response: Response;

  try {
    response = await fetch(buildUrl(`/api/chat/${encodeURIComponent(tripId)}/access`), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
  } catch {
    return false;
  }

  return response.ok;
};

