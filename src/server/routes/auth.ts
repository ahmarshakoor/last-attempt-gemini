import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, queryOne, execute } from '../../db/index.js';
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  getUserFromSession,
  formatSafeUser,
  verifyFirebaseIdToken,
  FirebaseTokenVerificationUnavailable,
} from '../auth.js';
import { NewUserPolicy } from '../../types.js';

export const authRouter = Router();

authRouter.get('/me', async (req: Request, res: Response) => {
  try {
    const user = await getUserFromSession(req);
    res.json({ user });
  } catch (err) {
    console.error('Error fetching current user:', err);
    const status = err instanceof FirebaseTokenVerificationUnavailable ? 503 : 500;
    res.status(status).json({ error: status === 503 ? 'Firebase token verification is temporarily unavailable.' : 'Failed to fetch session' });
  }
});

authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'Please provide a valid name (at least 2 characters).' });
      return;
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const db = await getDb();
    const existing = queryOne(db, 'SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
      return;
    }

    const policyRow = queryOne(db, "SELECT value FROM settings WHERE key = 'new_user_policy'");
    const policy: NewUserPolicy = (policyRow?.value as NewUserPolicy) || 'auto_3_months';
    const now = new Date();
    const nowIso = now.toISOString();
    let accessStatus: 'active' | 'pending' = 'active';
    let expiresAt: string | null = null;
    if (policy === 'auto_3_months') {
      expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
    } else if (policy === 'auto_1_month') {
      expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    } else {
      accessStatus = 'pending';
    }

    const passwordHash = await hashPassword(password);
    const userId = uuidv4();
    execute(
      db,
      `INSERT INTO users (id, name, email, password_hash, auth_provider_id, role, access_status, access_expires_at, created_at, updated_at, last_sign_in_at)
       VALUES (?, ?, ?, ?, 'local', 'user', ?, ?, ?, ?, ?)`,
      [userId, cleanName, cleanEmail, passwordHash, accessStatus, expiresAt, nowIso, nowIso, nowIso],
    );

    const sessionId = await createSession(userId, res, req);
    const createdUser = queryOne(db, 'SELECT * FROM users WHERE id = ?', [userId]);
    res.status(201).json({ user: formatSafeUser(createdUser), token: sessionId });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = await getDb();
    const userRow = queryOne(db, 'SELECT * FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (!userRow) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isMatch = await verifyPassword(password, userRow.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const sessionId = await createSession(userRow.id, res, req);
    res.json({ user: formatSafeUser(userRow), token: sessionId });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Exchange a cryptographically verified Firebase Google ID token for the app profile.
authRouter.post('/google', async (req: Request, res: Response) => {
  try {
    const authorization = req.headers.authorization;
    const idToken = typeof authorization === 'string'
      ? authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
      : null;
    if (!idToken) {
      res.status(401).json({ error: 'A Firebase ID token is required.' });
      return;
    }

    let claims;
    try {
      claims = await verifyFirebaseIdToken(idToken);
    } catch (error) {
      const unavailable = error instanceof FirebaseTokenVerificationUnavailable;
      res.status(unavailable ? 503 : 401).json({
        error: unavailable
          ? 'Firebase token verification is temporarily unavailable. Please retry.'
          : 'Google authentication could not be verified. Please sign in again.',
      });
      return;
    }

    const cleanEmail = claims.email;
    const cleanName = (claims.name && claims.name.trim()) || null;
    const cleanAvatar = typeof claims.picture === 'string' ? claims.picture : null;
    const db = await getDb();
    const nowIso = new Date().toISOString();

    const findExistingUser = () => {
      const byUid = queryOne<any>(db, 'SELECT * FROM users WHERE firebase_uid = ?', [claims.sub]);
      const byEmail = queryOne<any>(db, 'SELECT * FROM users WHERE LOWER(email) = ?', [cleanEmail]);
      if (byUid && byEmail && byUid.id !== byEmail.id) return { user: null, conflict: true };
      return { user: byUid || byEmail, conflict: false };
    };

    let lookup = findExistingUser();
    if (lookup.conflict) {
      res.status(409).json({ error: 'This Google identity conflicts with an existing application account.' });
      return;
    }

    let existing = lookup.user;
    if (!existing) {
      // No credentials are returned or used for this random password placeholder.
      const dummyPasswordHash = await hashPassword(uuidv4());
      lookup = findExistingUser();
      if (lookup.conflict) {
        res.status(409).json({ error: 'This Google identity conflicts with an existing application account.' });
        return;
      }
      existing = lookup.user;

      if (!existing) {
        const policyRow = queryOne(db, "SELECT value FROM settings WHERE key = 'new_user_policy'");
        const policy: NewUserPolicy = (policyRow?.value as NewUserPolicy) || 'auto_3_months';
        let accessStatus: 'active' | 'pending' = 'active';
        let expiresAt: string | null = null;
        if (policy === 'auto_3_months') {
          expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
        } else if (policy === 'auto_1_month') {
          expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        } else {
          accessStatus = 'pending';
        }

        execute(
          db,
          `INSERT INTO users (id, name, email, password_hash, avatar_url, auth_provider_id, firebase_uid, role, access_status, access_expires_at, created_at, updated_at, last_sign_in_at)
           VALUES (?, ?, ?, ?, ?, 'google', ?, 'user', ?, ?, ?, ?, ?)`,
          [uuidv4(), cleanName || cleanEmail.split('@')[0], cleanEmail, dummyPasswordHash, cleanAvatar, claims.sub, accessStatus, expiresAt, nowIso, nowIso, nowIso],
        );
      }
    }

    if (existing) {
      // Link legacy accounts by verified email/UID but preserve app role, access status,
      // expiry, password hash, and original creation date.
      const storedProvider = existing.auth_provider_id === 'local' ? 'local' : 'google';
      execute(
        db,
        `UPDATE users
         SET email = ?, name = COALESCE(?, name), avatar_url = COALESCE(?, avatar_url),
             auth_provider_id = ?, firebase_uid = ?, last_sign_in_at = ?, updated_at = ?
         WHERE id = ?`,
        [cleanEmail, cleanName, cleanAvatar, storedProvider, claims.sub, nowIso, nowIso, existing.id],
      );
    }

    // A Google ID token, not a temporary SQLite session, authenticates this request.
    await destroySession(req, res);
    const userRow = queryOne(db, 'SELECT * FROM users WHERE firebase_uid = ?', [claims.sub]);
    if (!userRow) {
      res.status(500).json({ error: 'Verified Google account profile could not be loaded.' });
      return;
    }
    res.json({ success: true, user: formatSafeUser(userRow) });
  } catch (err) {
    console.error('Google authentication error:', err);
    res.status(500).json({ error: 'Failed to process Google account authentication.' });
  }
});

authRouter.post('/logout', async (req: Request, res: Response) => {
  try {
    await destroySession(req, res);
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    // The unchanged static study page cannot call Firebase signOut itself. On its
    // redirect to the gateway, this one-time marker tells the Firebase client to sign out.
    res.cookie('last_attempt_firebase_signout', '1', {
      httpOnly: false,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: 60_000,
    });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Failed to log out' });
  }
});
