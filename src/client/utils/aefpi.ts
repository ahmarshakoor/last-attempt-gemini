import { auth } from '../firebase';

// Helper to attach authorization header if cookie is blocked in cross-origin iframes
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let token = typeof window !== 'undefined' ? localStorage.getItem('last_attempt_token') : null;

  if (!token && auth.currentUser) {
    try {
      token = await auth.currentUser.getIdToken();
      if (token) {
        localStorage.setItem('last_attempt_token', token);
      }
    } catch (e) {
      console.warn('Could not get Firebase ID token:', e);
    }
  }

  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  // If 401 and Firebase user exists, try refreshing token and retrying once
  if (res.status === 401 && auth.currentUser) {
    try {
      const refreshedToken = await auth.currentUser.getIdToken(true);
      if (refreshedToken) {
        localStorage.setItem('last_attempt_token', refreshedToken);
        headers.set('Authorization', `Bearer ${refreshedToken}`);
        res = await fetch(url, {
          ...options,
          headers,
          credentials: 'include',
        });
      }
    } catch (e) {
      console.warn('Token refresh retry error:', e);
    }
  }

  return res;
}
