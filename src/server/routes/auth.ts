import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, queryOne, execute } from '../../db/index.js';
import { hashPassword, verifyPassword, createSession, destroySession, getUserFromSession, formatSafeUser } from '../auth.js';
import { NewUserPolicy, User } from '../../types.js';

export const authRouter = Router();

authRouter.get('/me', async (req: Request, res: Response) => {
  try {
    const user = await getUserFromSession(req);
    res.json({ user });
  } catch (err) {
    console.error('Error fetching current user:', err);
    res.status(500).json({ error: 'Failed to fetch session' });
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

    // Determine initial access policy
    const policyRow = queryOne(db, "SELECT value FROM settings WHERE key = 'new_user_policy'");
    const policy: NewUserPolicy = (policyRow?.value as NewUserPolicy) || 'auto_3_months';

    const now = new Date();
    const nowIso = now.toISOString();
    let accessStatus: 'active' | 'pending' = 'active';
    let expiresAt: string | null = null;
    let role: 'user' | 'admin' = 'user';

    // Auto-promote designated owner email
    if (cleanEmail === 'drahmarshakoor@gmail.com') {
      role = 'admin';
      accessStatus = 'active';
      expiresAt = null;
    } else {
      if (policy === 'auto_3_months') {
        accessStatus = 'active';
        expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
      } else if (policy === 'auto_1_month') {
        accessStatus = 'active';
        expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      } else {
        accessStatus = 'pending';
        expiresAt = null;
      }
    }

    const passwordHash = await hashPassword(password);
    const userId = uuidv4();

    execute(
      db,
      `INSERT INTO users (id, name, email, password_hash, auth_provider_id, role, access_status, access_expires_at, created_at, updated_at, last_sign_in_at)
       VALUES (?, ?, ?, ?, 'local', ?, ?, ?, ?, ?, ?)`,
      [userId, cleanName, cleanEmail, passwordHash, role, accessStatus, expiresAt, nowIso, nowIso, nowIso]
    );

    // Auto-create session
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

// Authentic Google Sign-In with Firebase verification
authRouter.post('/google', async (req: Request, res: Response) => {
  try {
    const { email, name, photoURL, uid } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ error: 'Valid verified Google email is required.' });
      return;
    }

    if (!uid || typeof uid !== 'string') {
      res.status(400).json({ error: 'Valid Google Auth UID is required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name && typeof name === 'string' && name.trim()) ? name.trim() : cleanEmail.split('@')[0];
    const cleanAvatar = (photoURL && typeof photoURL === 'string') ? photoURL : null;

    const db = await getDb();
    const existing = queryOne(db, 'SELECT * FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    const nowIso = new Date().toISOString();

    let userId: string;

    if (existing) {
      userId = existing.id;
      // Auto-promote designated owner Dr. Ahmar Shakoor
      const isOwner = cleanEmail === 'drahmarshakoor@gmail.com';
      const role = isOwner ? 'admin' : (existing.role || 'user');
      const accessStatus = isOwner ? 'active' : existing.access_status;
      const expiresAt = isOwner ? null : existing.access_expires_at;

      execute(
        db,
        `UPDATE users 
         SET name = ?, avatar_url = COALESCE(?, avatar_url), auth_provider_id = 'google', 
             role = ?, access_status = ?, access_expires_at = ?, last_sign_in_at = ?, updated_at = ?
         WHERE id = ?`,
        [cleanName, cleanAvatar, role, accessStatus, expiresAt, nowIso, nowIso, userId]
      );
    } else {
      // Create new user account from verified Google identity
      userId = uuidv4();
      const policyRow = queryOne(db, "SELECT value FROM settings WHERE key = 'new_user_policy'");
      const policy: NewUserPolicy = (policyRow?.value as NewUserPolicy) || 'auto_3_months';

      let role: 'user' | 'admin' = 'user';
      let accessStatus: 'active' | 'pending' = 'active';
      let expiresAt: string | null = null;

      if (cleanEmail === 'drahmarshakoor@gmail.com') {
        role = 'admin';
        accessStatus = 'active';
        expiresAt = null;
      } else {
        const now = new Date();
        if (policy === 'auto_3_months') {
          accessStatus = 'active';
          expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
        } else if (policy === 'auto_1_month') {
          accessStatus = 'active';
          expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        } else {
          accessStatus = 'pending';
          expiresAt = null;
        }
      }

      // Google users have a randomized secure hash placeholder
      const dummyPasswordHash = await hashPassword(uuidv4());

      execute(
        db,
        `INSERT INTO users (id, name, email, password_hash, avatar_url, auth_provider_id, role, access_status, access_expires_at, created_at, updated_at, last_sign_in_at)
         VALUES (?, ?, ?, ?, ?, 'google', ?, ?, ?, ?, ?, ?)`,
        [userId, cleanName, cleanEmail, dummyPasswordHash, cleanAvatar, role, accessStatus, expiresAt, nowIso, nowIso, nowIso]
      );
    }

    const sessionId = await createSession(userId, res, req);
    const userRow = queryOne(db, 'SELECT * FROM users WHERE id = ?', [userId]);

    res.json({
      success: true,
      user: formatSafeUser(userRow),
      token: sessionId,
      isOwner: cleanEmail === 'drahmarshakoor@gmail.com',
    });
  } catch (err) {
    console.error('Google authentication error:', err);
    res.status(500).json({ error: 'Failed to process Google account authentication.' });
  }
});

authRouter.post('/logout', async (req: Request, res: Response) => {
  try {
    await destroySession(req, res);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Failed to log out' });
  }
});
