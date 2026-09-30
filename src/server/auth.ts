import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb, queryOne, execute } from '../db/index.js';
import { User } from '../types.js';

export const SESSION_COOKIE_NAME = 'last_attempt_session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function formatSafeUser(rawUser: any): User {
  return {
    id: rawUser.id,
    name: rawUser.name,
    email: rawUser.email,
    avatar_url: rawUser.avatar_url || null,
    auth_provider_id: rawUser.auth_provider_id || 'local',
    role: rawUser.role,
    access_status: rawUser.access_status,
    access_expires_at: rawUser.access_expires_at,
    created_at: rawUser.created_at,
    updated_at: rawUser.updated_at,
    last_sign_in_at: rawUser.last_sign_in_at,
  };
}

export function setSessionCookie(res: Response, req?: Request, sessionId?: string): void {
  if (!sessionId) return;
  const isHttps = req ? (req.secure || req.headers['x-forwarded-proto'] === 'https') : true;
  res.cookie(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    path: '/',
    maxAge: SESSION_DURATION_MS,
  });
}

export async function createSession(userId: string, res?: Response, req?: Request): Promise<string> {
  const db = await getDb();
  const sessionId = uuidv4();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS).toISOString();

  execute(
    db,
    'INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
    [sessionId, userId, expiresAt, now.toISOString()]
  );

  // Update last sign in time for user
  execute(
    db,
    'UPDATE users SET last_sign_in_at = ?, updated_at = ? WHERE id = ?',
    [now.toISOString(), now.toISOString(), userId]
  );

  if (res) {
    setSessionCookie(res, req, sessionId);
  }

  return sessionId;
}

export function getSessionIdFromReq(req: Request): string | null {
  let sessionId = req.cookies?.[SESSION_COOKIE_NAME];
  if (!sessionId && req.headers.authorization?.startsWith('Bearer ')) {
    sessionId = req.headers.authorization.slice(7).trim();
  }
  if (!sessionId && req.headers['x-session-token']) {
    sessionId = String(req.headers['x-session-token']).trim();
  }
  if (!sessionId && req.query?.token) {
    sessionId = String(req.query.token).trim();
  }
  return sessionId || null;
}

export async function getUserFromSession(req: Request): Promise<User | null> {
  const sessionId = getSessionIdFromReq(req);
  if (!sessionId) return null;

  const db = await getDb();
  const now = new Date().toISOString();

  // 1. Check local session database
  const sessionRow = queryOne(
    db,
    `SELECT s.id as session_id, s.expires_at, u.*
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.id = ? AND s.expires_at > ?`,
    [sessionId, now]
  );

  if (sessionRow) {
    if (sessionRow.email?.toLowerCase() === 'drahmarshakoor@gmail.com' && sessionRow.role !== 'admin') {
      execute(db, "UPDATE users SET role = 'admin', access_status = 'active' WHERE id = ?", [sessionRow.id]);
      sessionRow.role = 'admin';
      sessionRow.access_status = 'active';
    }
    return formatSafeUser(sessionRow);
  }

  // 2. Check if token is a Firebase ID token (JWT format: header.payload.signature)
  if (sessionId.includes('.') && sessionId.split('.').length === 3) {
    try {
      const parts = sessionId.split('.');
      const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf-8');
      const payload = JSON.parse(payloadJson);
      const email = payload.email ? String(payload.email).trim().toLowerCase() : null;

      if (email) {
        let userRow = queryOne(db, 'SELECT * FROM users WHERE LOWER(email) = ?', [email]);
        const nowIso = new Date().toISOString();
        const isOwner = email === 'drahmarshakoor@gmail.com';

        if (!userRow) {
          const userId = uuidv4();
          const role = (isOwner || payload.admin === true) ? 'admin' : 'user';
          const name = payload.name || email.split('@')[0];
          const avatar = payload.picture || null;
          const dummyHash = await hashPassword(uuidv4());

          execute(
            db,
            `INSERT INTO users (id, name, email, password_hash, avatar_url, auth_provider_id, role, access_status, access_expires_at, created_at, updated_at, last_sign_in_at)
             VALUES (?, ?, ?, ?, ?, 'google', ?, 'active', null, ?, ?, ?)`,
            [userId, name, email, dummyHash, avatar, role, nowIso, nowIso, nowIso]
          );
          userRow = queryOne(db, 'SELECT * FROM users WHERE id = ?', [userId]);
        } else if (isOwner && userRow.role !== 'admin') {
          execute(db, "UPDATE users SET role = 'admin', access_status = 'active' WHERE id = ?", [userRow.id]);
          userRow = queryOne(db, 'SELECT * FROM users WHERE id = ?', [userRow.id]);
        }

        if (userRow) {
          return formatSafeUser(userRow);
        }
      }
    } catch (jwtErr) {
      console.warn('Failed parsing JWT token in getUserFromSession:', jwtErr);
    }
  }

  return null;
}

export async function destroySession(req: Request, res?: Response): Promise<void> {
  const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
  if (sessionId) {
    const db = await getDb();
    execute(db, 'DELETE FROM sessions WHERE id = ?', [sessionId]);
  }

  if (res) {
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  }
}
