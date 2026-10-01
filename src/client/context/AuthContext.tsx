import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { User as AppUser } from '../../types';
import { auth, loginWithGooglePopup, logoutFirebase, syncUserToFirestore } from '../firebase';

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

const bc = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('last-attempt-auth-sync')
  : null;

function setAuthState(state: 'logged-in' | 'logged-out') {
  try {
    localStorage.setItem('last-attempt-auth-state', state);
  } catch {}
}

function notifyLogout() {
  setAuthState('logged-out');
  if (bc) {
    try {
      bc.postMessage({ type: 'logout' });
    } catch {}
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync logout across tabs
  useEffect(() => {
    const handleBc = (e: MessageEvent) => {
      if (e.data && e.data.type === 'logout') {
        setUser(null);
        if (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/study')) {
          window.location.replace('/');
        }
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'last-attempt-auth-state' && e.newValue === 'logged-out') {
        setUser(null);
        if (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/study')) {
          window.location.replace('/');
        }
      }
    };
    if (bc) bc.addEventListener('message', handleBc);
    window.addEventListener('storage', handleStorage);
    return () => {
      if (bc) bc.removeEventListener('message', handleBc);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    let active = true;

    // Step 3c: On startup, first call GET /api/auth/me (credentials: include).
    // If it returns a user, setUser and setIsLoading(false) IMMEDIATELY!
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        if (data?.user) {
          setUser(data.user);
          setIsLoading(false);
          setAuthState('logged-in');
        }
      })
      .catch((err) => console.warn('Initial session check error:', err));

    // Listen to Firebase auth changes in the background
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!active) return;
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          const res = await fetch('/api/auth/google', {
            method: 'POST',
            credentials: 'include',
            headers: {
              Authorization: `Bearer ${idToken}`,
              'Content-Type': 'application/json',
            },
            body: '{}',
          });
          if (res.ok) {
            const data = await res.json();
            if (active && data.user) {
              setUser(data.user);
              setAuthState('logged-in');
              // Fire-and-forget sync to Firestore (do not block UI render)
              syncUserToFirestore({
                id: firebaseUser.uid,
                name: data.user.name,
                email: data.user.email,
                avatar_url: data.user.avatar_url || firebaseUser.photoURL || null,
                role: data.user.role,
                access_status: data.user.access_status,
                access_expires_at: data.user.access_expires_at,
              }).catch(() => {});
            }
          }
        } catch (err) {
          console.warn('Background Firebase session refresh error:', err);
        } finally {
          if (active) setIsLoading(false);
        }
      } else {
        // If not logged in with Firebase, finish loading if we haven't already
        if (active) setIsLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const loginWithGoogle = async () => {
    const firebaseUser = await loginWithGooglePopup();
    if (!firebaseUser) throw new Error('No user returned from Google popup');
    const idToken = await firebaseUser.getIdToken();
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to authenticate Google account');
    setUser(data.user);
    setAuthState('logged-in');

    // Fire-and-forget Firestore sync
    syncUserToFirestore({
      id: firebaseUser.uid,
      name: data.user.name,
      email: data.user.email,
      avatar_url: data.user.avatar_url || firebaseUser.photoURL || null,
      role: data.user.role,
      access_status: data.user.access_status,
      access_expires_at: data.user.access_expires_at,
    }).catch(() => {});
  };

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to sign in');
    setUser(data.user);
    setAuthState('logged-in');
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create account');
    setUser(data.user);
    setAuthState('logged-in');
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Sign-out error:', err);
    } finally {
      notifyLogout();
      await logoutFirebase();
      setUser(null);
      window.location.replace('/');
    }
  };

  const refreshUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (err) {
      console.error('Refresh user error:', err);
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
