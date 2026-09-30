import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../../types';
import { auth, loginWithGooglePopup, logoutFirebase, syncUserToFirestore } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('last_attempt_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/auth/me', { headers });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to load session user', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && fbUser.email) {
        const isOwner = fbUser.email.toLowerCase() === 'drahmarshakoor@gmail.com';
        const defaultExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
        await syncUserToFirestore({
          id: fbUser.uid,
          name: fbUser.displayName || fbUser.email.split('@')[0],
          email: fbUser.email.toLowerCase(),
          avatar_url: fbUser.photoURL || null,
          role: isOwner ? 'admin' : 'user',
          access_status: 'active',
          access_expires_at: isOwner ? null : defaultExpiry,
          auth_provider_id: 'google',
          last_sign_in_at: new Date().toISOString(),
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const fbUser = await loginWithGooglePopup();
    if (!fbUser || !fbUser.email) {
      throw new Error('Google authentication was cancelled or returned no email.');
    }

    const isOwner = fbUser.email.toLowerCase() === 'drahmarshakoor@gmail.com';
    const now = new Date();
    const defaultExpiry = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

    // Persist immediately to Firestore cloud database
    await syncUserToFirestore({
      id: fbUser.uid,
      name: fbUser.displayName || fbUser.email.split('@')[0],
      email: fbUser.email.toLowerCase(),
      avatar_url: fbUser.photoURL || null,
      role: isOwner ? 'admin' : 'user',
      access_status: 'active',
      access_expires_at: isOwner ? null : defaultExpiry,
      auth_provider_id: 'google',
      created_at: now.toISOString(),
      last_sign_in_at: now.toISOString(),
    });

    const idToken = await fbUser.getIdToken();
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: fbUser.email,
        name: fbUser.displayName || fbUser.email.split('@')[0],
        photoURL: fbUser.photoURL || null,
        uid: fbUser.uid,
        idToken,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to authenticate Google account');
    }

    if (data.token) {
      localStorage.setItem('last_attempt_token', data.token);
    }
    setUser(data.user);
  };

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to sign in');
    }

    if (data.token) {
      localStorage.setItem('last_attempt_token', data.token);
    }
    setUser(data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create account');
    }

    if (data.token) {
      localStorage.setItem('last_attempt_token', data.token);
    }
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await logoutFirebase();
      const token = localStorage.getItem('last_attempt_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch('/api/auth/logout', { method: 'POST', headers });
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      localStorage.removeItem('last_attempt_token');
      setUser(null);
      window.location.href = '/';
    }
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
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
