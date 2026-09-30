import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { User as AppUser } from '../../types';
import {
  auth,
  authPersistenceReady,
  loginWithGooglePopup,
  logoutFirebase,
  syncUserToFirestore,
} from '../firebase';
import { getStoredAppSessionToken } from '../utils/api';

interface AuthContextType {
  user: AppUser | null;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const FIREBASE_SIGNOUT_MARKER = 'last_attempt_firebase_signout';
const LEGACY_SESSION_KEY = 'last_attempt_token';

function safeRemoveStoredToken(): void {
  try {
    localStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    // Authentication remains governed by Firebase even when browser storage is unavailable.
  }
}

function clearSignoutMarkerCookie(): void {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${FIREBASE_SIGNOUT_MARKER}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
}

function consumeSignoutMarkerCookie(): boolean {
  if (typeof document === 'undefined') return false;
  const marker = document.cookie
    .split(';')
    .some((cookie) => cookie.trim() === `${FIREBASE_SIGNOUT_MARKER}=1`);
  if (marker) clearSignoutMarkerCookie();
  return marker;
}

function attachStatus(error: Error, status: number): Error & { status: number } {
  return Object.assign(error, { status });
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const pendingFirebaseProfiles = useRef(new Map<string, Promise<AppUser>>());

  const fetchLocalAccount = useCallback(async (): Promise<AppUser | null> => {
    const token = getStoredAppSessionToken();
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const response = await fetch('/api/auth/me', {
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) safeRemoveStoredToken();
      return null;
    }

    const data = await response.json();
    if (!data.user && token) safeRemoveStoredToken();
    return (data.user as AppUser | null) ?? null;
  }, []);

  const resolveFirebaseAccount = useCallback((firebaseUser: FirebaseUser): Promise<AppUser> => {
    const inFlight = pendingFirebaseProfiles.current.get(firebaseUser.uid);
    if (inFlight) return inFlight;

    const request = (async () => {
      // The Firebase SDK owns the persistent refresh credential; never copy its ID token
      // into the app's legacy SQLite-session localStorage key.
      safeRemoveStoredToken();

      const callGoogleProfile = async (forceRefresh: boolean) => {
        const idToken = await firebaseUser.getIdToken(forceRefresh);
        return fetch('/api/auth/google', {
          method: 'POST',
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
          body: '{}',
        });
      };

      let response = await callGoogleProfile(false);
      if (response.status === 401) response = await callGoogleProfile(true);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw attachStatus(
          new Error(data.error || 'Could not restore the Google-authenticated account.'),
          response.status,
        );
      }
      if (!data.user) throw new Error('The verified account has no application profile.');

      const appUser = data.user as AppUser;
      // Mirror only the profile returned by the verified backend; role/access values
      // are never inferred from unverified client claims.
      await syncUserToFirestore({
        id: firebaseUser.uid,
        name: appUser.name,
        email: appUser.email,
        avatar_url: appUser.avatar_url ?? firebaseUser.photoURL ?? null,
        auth_provider_id: appUser.auth_provider_id,
        role: appUser.role,
        access_status: appUser.access_status,
        access_expires_at: appUser.access_expires_at,
        created_at: appUser.created_at,
        last_sign_in_at: appUser.last_sign_in_at ?? new Date().toISOString(),
      });
      return appUser;
    })();

    const tracked = request.finally(() => {
      if (pendingFirebaseProfiles.current.get(firebaseUser.uid) === tracked) {
        pendingFirebaseProfiles.current.delete(firebaseUser.uid);
      }
    });
    pendingFirebaseProfiles.current.set(firebaseUser.uid, tracked);
    return tracked;
  }, []);

  useEffect(() => {
    let mounted = true;
    let forceFirebaseSignout = consumeSignoutMarkerCookie();
    let unsubscribe: (() => void) | undefined;

    const startAuthListener = async () => {
      try {
        await authPersistenceReady;
        if (!mounted) return;

        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (!mounted) return;
          setIsLoading(true);

          try {
            if (forceFirebaseSignout) {
              forceFirebaseSignout = false;
              safeRemoveStoredToken();
              if (firebaseUser) await logoutFirebase();
              if (mounted) setUser(null);
              return;
            }

            if (firebaseUser) {
              safeRemoveStoredToken();
              const appUser = await resolveFirebaseAccount(firebaseUser);
              if (mounted) setUser(appUser);
            } else {
              const localUser = await fetchLocalAccount();
              if (mounted) setUser(localUser);
            }
          } catch (error) {
            console.error('Could not restore the application account:', error);
            const status = (error as { status?: number })?.status;
            if (firebaseUser && status === 401) {
              safeRemoveStoredToken();
              await logoutFirebase();
            }
            if (mounted) setUser(null);
          } finally {
            if (mounted) setIsLoading(false);
          }
        });
      } catch (error) {
        console.error('Firebase local persistence could not be initialized:', error);
        if (mounted) {
          setUser(null);
          setIsLoading(false);
        }
      }
    };

    void startAuthListener();
    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [fetchLocalAccount, resolveFirebaseAccount]);

  const loginWithGoogle = async () => {
    await authPersistenceReady;
    const firebaseUser = await loginWithGooglePopup();
    const appUser = await resolveFirebaseAccount(firebaseUser);
    setUser(appUser);
  };

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to sign in');

    if (data.token) {
      try {
        localStorage.setItem(LEGACY_SESSION_KEY, data.token);
      } catch {
        // The server cookie can still support this legacy password session.
      }
    }
    await logoutFirebase();
    setUser(data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to create account');

    if (data.token) {
      try {
        localStorage.setItem(LEGACY_SESSION_KEY, data.token);
      } catch {
        // The server cookie can still support this legacy password session.
      }
    }
    await logoutFirebase();
    setUser(data.user);
  };

  const logout = async () => {
    try {
      const firebaseUser = auth.currentUser;
      const token = firebaseUser
        ? await firebaseUser.getIdToken().catch(() => null)
        : getStoredAppSessionToken();
      const headers = new Headers();
      if (token) headers.set('Authorization', `Bearer ${token}`);

      await fetch('/api/auth/logout', {
        method: 'POST',
        headers,
        credentials: 'include',
      });
    } catch (error) {
      console.error('Application sign-out request failed:', error);
    } finally {
      clearSignoutMarkerCookie();
      safeRemoveStoredToken();
      await logoutFirebase();
      setUser(null);
      window.location.href = '/';
    }
  };

  const refreshUser = async () => {
    setIsLoading(true);
    try {
      const firebaseUser = auth.currentUser;
      const nextUser = firebaseUser
        ? await resolveFirebaseAccount(firebaseUser)
        : await fetchLocalAccount();
      setUser(nextUser);
    } catch (error) {
      console.error('Could not refresh the application account:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, loginWithGoogle, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
