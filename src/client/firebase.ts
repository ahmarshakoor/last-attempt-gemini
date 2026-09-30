import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { User } from '../types';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export async function loginWithGooglePopup() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function logoutFirebase() {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Firebase signout warning:', err);
  }
}

// Sync user document directly in Firestore
export async function syncUserToFirestore(userData: {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
  role?: 'admin' | 'user';
  access_status?: 'active' | 'pending' | 'revoked' | 'expired';
  access_expires_at?: string | null;
  auth_provider_id?: string;
  last_sign_in_at?: string;
  created_at?: string;
}): Promise<void> {
  try {
    const cleanEmail = userData.email.toLowerCase().trim();
    const isOwner = cleanEmail === 'drahmarshakoor@gmail.com';
    const userRef = doc(db, 'users', userData.id);
    const existingSnap = await getDoc(userRef);
    const nowIso = new Date().toISOString();

    if (existingSnap.exists()) {
      const existing = existingSnap.data();
      await setDoc(
        userRef,
        {
          name: userData.name || existing.name,
          email: cleanEmail,
          avatar_url: userData.avatar_url ?? existing.avatar_url ?? null,
          role: isOwner ? 'admin' : (existing.role || userData.role || 'user'),
          access_status: isOwner ? 'active' : (existing.access_status || userData.access_status || 'active'),
          access_expires_at: isOwner ? null : (existing.access_expires_at ?? userData.access_expires_at ?? null),
          last_sign_in_at: nowIso,
          updated_at: nowIso,
        },
        { merge: true }
      );
    } else {
      const defaultExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
      await setDoc(userRef, {
        id: userData.id,
        name: userData.name || cleanEmail.split('@')[0],
        email: cleanEmail,
        avatar_url: userData.avatar_url || null,
        auth_provider_id: userData.auth_provider_id || 'google',
        role: isOwner ? 'admin' : (userData.role || 'user'),
        access_status: isOwner ? 'active' : (userData.access_status || 'active'),
        access_expires_at: isOwner ? null : (userData.access_expires_at ?? defaultExpiresAt),
        created_at: userData.created_at || nowIso,
        updated_at: nowIso,
        last_sign_in_at: nowIso,
      });
    }
  } catch (err) {
    console.warn('Failed to sync user to Firestore:', err);
  }
}

// Fetch all users directly from Firestore for the admin
export async function getFirestoreUsers(): Promise<User[]> {
  try {
    const usersCol = collection(db, 'users');
    const snap = await getDocs(usersCol);
    const users: User[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      // Filter out any fake bot emails
      if (data.email && !data.email.endsWith('@example.com') && data.email !== 'admin@lastattempt.com') {
        users.push({
          id: data.id || docSnap.id,
          name: data.name || data.email.split('@')[0],
          email: data.email,
          avatar_url: data.avatar_url || null,
          auth_provider_id: data.auth_provider_id || 'google',
          role: data.email.toLowerCase() === 'drahmarshakoor@gmail.com' ? 'admin' : (data.role || 'user'),
          access_status: data.access_status || 'active',
          access_expires_at: data.access_expires_at ?? null,
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString(),
          last_sign_in_at: data.last_sign_in_at || null,
        });
      }
    });
    return users;
  } catch (err) {
    console.warn('Could not fetch users directly from Firestore:', err);
    return [];
  }
}
