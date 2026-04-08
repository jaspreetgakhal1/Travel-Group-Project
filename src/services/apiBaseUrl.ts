const CONFIGURED_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? '';

const isLoopbackHost = (hostname: string): boolean => hostname === 'localhost' || hostname === '127.0.0.1';

export const resolveApiBaseUrl = (): string => {
  if (!CONFIGURED_API_BASE_URL || typeof window === 'undefined') {
    return CONFIGURED_API_BASE_URL;
  }

  try {
    const configuredUrl = new URL(CONFIGURED_API_BASE_URL);
    const appHostname = window.location.hostname;

    // When a dev build is opened from another device, a localhost API base points
    // at that other device. Falling back to same-origin lets Vite proxy `/api`.
    if (isLoopbackHost(configuredUrl.hostname) && !isLoopbackHost(appHostname)) {
      return window.location.origin;
    }
  } catch {
    return CONFIGURED_API_BASE_URL;
  }

  return CONFIGURED_API_BASE_URL;
};

export const buildApiUrl = (path: string): string => `${resolveApiBaseUrl()}${path}`;
