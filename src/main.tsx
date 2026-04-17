// Added by Codex: project documentation comment for src\main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  if (params.get('clearStorage') === '1') {
    // One-time helper to clear SplitNGo auth/session keys in the current browser origin
    // without affecting unrelated site data. Useful when switching between local auth states.
    const storageKeys = [
      'splitngo_auth_token',
      'splitngo_user_session',
      'splitngo_last_viewed_trip_id',
      'splitngo_post_auth_redirect',
      'google_oauth_state',
    ];

    for (const key of storageKeys) {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    }

    params.delete('clearStorage');
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
    window.history.replaceState({}, document.title, nextUrl);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

