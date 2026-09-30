import { auth } from '../firebase';

const LEGACY_SESSION_KEY = 'last_attempt_token';

/** Returns only legacy opaque app-session IDs; Firebase ID tokens belong to Firebase Auth. */
export function getStoredAppSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const token = localStorage.getItem(LEGACY_SESSION_KEY);
    if (token && token.split('.').length === 3) {
      // Remove Firebase ID tokens left by older builds. Firebase Auth now restores its
      // own persistent user and supplies fresh ID tokens directly from its SDK.
      localStorage.removeItem(LEGACY_SESSION_KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const firebaseUser = auth.currentUser;
  let token = firebaseUser
    ? await firebaseUser.getIdToken().catch(() => null)
    : getStoredAppSessionToken();

  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);

  const request = () => fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  let response = await request();
  if (response.status === 401 && firebaseUser) {
    try {
      token = await firebaseUser.getIdToken(true);
      headers.set('Authorization', `Bearer ${token}`);
      response = await request();
    } catch (error) {
      console.warn('Could not refresh Firebase ID token for authenticated request:', error);
    }
  }
  return response;
}
