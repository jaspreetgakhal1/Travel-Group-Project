const CONFIGURED_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? '';

const isLoopbackHost = (hostname: string): boolean => hostname === 'localhost' || hostname === '127.0.0.1';
const trimTrailingSlashes = (value: string): string => value.replace(/\/+$/, '');
const normalizeRequestPath = (value: string): string => (value.startsWith('/') ? value : `/${value}`);
const normalizeBaseForPath = (baseUrl: string, requestPath: string): string => {
  const normalizedBaseUrl = trimTrailingSlashes(baseUrl);

  if (!normalizedBaseUrl || !(requestPath === '/api' || requestPath.startsWith('/api/'))) {
    return normalizedBaseUrl;
  }

  return normalizedBaseUrl.replace(/\/api$/i, '');
};

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

export const buildApiUrl = (path: string): string => {
  const normalizedPath = normalizeRequestPath(path);
  const normalizedBaseUrl = normalizeBaseForPath(resolveApiBaseUrl(), normalizedPath);

  return normalizedBaseUrl ? `${normalizedBaseUrl}${normalizedPath}` : normalizedPath;
};
