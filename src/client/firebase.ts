import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { User } from '../types';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
// Firebase owns the durable browser session. It survives reloads and browser restarts,
// but remains isolated to this browser/device and is cleared by signOut().
export const authPersistenceReady = setPersistence(auth, browserLocalPersistence);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function loginWithGooglePopup() {
  await authPersistenceReady;
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

// Mirror the verified application profile returned by the backend into the existing
// Firestore user document. Access values are supplied by the app database, not inferred
// from Firebase token claims or the user's email address.
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
    const userRef = doc(db, 'users', userData.id);
    const existingSnap = await getDoc(userRef);
    const existing = existingSnap.exists() ? existingSnap.data() : null;
    const nowIso = new Date().toISOString();

    const profile = {
      id: userData.id,
      name: userData.name || existing?.name || cleanEmail.split('@')[0],
      email: cleanEmail,
      avatar_url: userData.avatar_url ?? existing?.avatar_url ?? null,
      auth_provider_id: userData.auth_provider_id || existing?.auth_provider_id || 'google',
      role: userData.role ?? existing?.role ?? 'user',
      access_status: userData.access_status ?? existing?.access_status ?? 'active',
      access_expires_at: userData.access_expires_at !== undefined
        ? userData.access_expires_at
        : (existing?.access_expires_at ?? null),
      last_sign_in_at: userData.last_sign_in_at || nowIso,
      updated_at: nowIso,
    };

    await setDoc(userRef, {
      ...profile,
      ...(!existing ? { created_at: userData.created_at || nowIso } : {}),
    }, { merge: true });
  } catch (err) {
    // Firestore is the existing cloud mirror; the verified application profile remains
    // available from the backend database if this optional mirror is temporarily offline.
    console.warn('Failed to sync verified user profile to Firestore:', err);
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
      // Filter out any fake bot emails; application roles come from stored app data.
      if (data.email && !data.email.endsWith('@example.com') && data.email !== 'admin@lastattempt.com') {
        users.push({
          id: data.id || docSnap.id,
          name: data.name || data.email.split('@')[0],
          email: data.email,
          avatar_url: data.avatar_url || null,
          auth_provider_id: data.auth_provider_id || 'google',
          role: data.role || 'user',
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
