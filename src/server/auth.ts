import { verify as verifySignature } from 'node:crypto';
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb, queryOne, execute } from '../db/index.js';
import { User } from '../types.js';
import firebaseConfig from '../../firebase-applet-config.json';

export const SESSION_COOKIE_NAME = 'last_attempt_session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // Legacy password-account sessions only.
const FIREBASE_CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;

export interface VerifiedFirebaseClaims {
  sub: string;
  email: string;
  email_verified: true;
  name?: string;
  picture?: string;
  auth_time: number;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
  firebase: { sign_in_provider: string };
}

export class InvalidFirebaseIdToken extends Error {
  constructor(message = 'Invalid Firebase ID token') {
    super(message);
    this.name = 'InvalidFirebaseIdToken';
  }
}

export class FirebaseTokenVerificationUnavailable extends Error {
  constructor(message = 'Firebase token verification is temporarily unavailable') {
    super(message);
    this.name = 'FirebaseTokenVerificationUnavailable';
  }
}

let cachedSigningCertificates: { values: Record<string, string>; expiresAt: number } | null = null;

export function isFirebaseIdToken(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.length <= 20_000 && value.split('.').length === 3;
}

async function getFirebaseSigningCertificates(): Promise<Record<string, string>> {
  if (cachedSigningCertificates && cachedSigningCertificates.expiresAt > Date.now()) {
    return cachedSigningCertificates.values;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(FIREBASE_CERTS_URL, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new FirebaseTokenVerificationUnavailable();

    const raw = await response.json() as Record<string, unknown>;
    const certificates: Record<string, string> = {};
    for (const [keyId, certificate] of Object.entries(raw)) {
      if (keyId && typeof certificate === 'string') certificates[keyId] = certificate;
    }
    if (Object.keys(certificates).length === 0) throw new FirebaseTokenVerificationUnavailable();

    const cacheControl = response.headers.get('cache-control') || '';
    const maxAge = cacheControl.match(/max-age=(\d+)/i);
    const lifetimeSeconds = maxAge ? Number(maxAge[1]) : 300;
    cachedSigningCertificates = {
      values: certificates,
      expiresAt: Date.now() + Math.max(0, lifetimeSeconds * 1000 - 5_000),
    };
    return certificates;
  } catch (error) {
    if (error instanceof FirebaseTokenVerificationUnavailable) throw error;
    throw new FirebaseTokenVerificationUnavailable();
  } finally {
    clearTimeout(timeout);
  }
}

export async function verifyFirebaseIdToken(token: string): Promise<VerifiedFirebaseClaims> {
  if (!FIREBASE_PROJECT_ID || !isFirebaseIdToken(token)) throw new InvalidFirebaseIdToken();

  const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
  let header: Record<string, unknown>;
  let claims: Record<string, unknown>;
  try {
    header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8'));
    claims = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    throw new InvalidFirebaseIdToken();
  }

  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid) {
    throw new InvalidFirebaseIdToken();
  }

  const certificates = await getFirebaseSigningCertificates();
  const certificate = certificates[header.kid];
  if (!certificate) throw new InvalidFirebaseIdToken();

  let signatureIsValid = false;
  try {
    signatureIsValid = verifySignature(
      'RSA-SHA256',
      Buffer.from(`${encodedHeader}.${encodedPayload}`),
      certificate,
      Buffer.from(encodedSignature, 'base64url'),
    );
  } catch {
    throw new InvalidFirebaseIdToken();
  }
  if (!signatureIsValid) throw new InvalidFirebaseIdToken();

  const now = Math.floor(Date.now() / 1000);
  const provider = (claims.firebase as Record<string, unknown> | undefined)?.sign_in_provider;
  const email = typeof claims.email === 'string' ? claims.email.trim().toLowerCase() : '';
  if (
    claims.aud !== FIREBASE_PROJECT_ID ||
    claims.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}` ||
    typeof claims.sub !== 'string' || claims.sub.length === 0 || claims.sub.length > 128 ||
    !email.includes('@') || claims.email_verified !== true ||
    provider !== 'google.com' ||
    typeof claims.exp !== 'number' || claims.exp <= now ||
    typeof claims.iat !== 'number' || claims.iat > now + 60 ||
    typeof claims.auth_time !== 'number' || claims.auth_time > now + 60
  ) {
    throw new InvalidFirebaseIdToken();
  }

  return claims as unknown as VerifiedFirebaseClaims;
}

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
    [sessionId, userId, expiresAt, now.toISOString()],
  );
  execute(
    db,
    'UPDATE users SET last_sign_in_at = ?, updated_at = ? WHERE id = ?',
    [now.toISOString(), now.toISOString(), userId],
  );
  if (res) setSessionCookie(res, req, sessionId);
  return sessionId;
}

export function getSessionIdFromReq(req: Request): string | null {
  const cookieToken = req.cookies?.[SESSION_COOKIE_NAME];
  const authorization = req.headers.authorization;
  const bearer = typeof authorization === 'string' ? authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() : null;
  const sessionHeader = req.headers['x-session-token'];
  const headerToken = typeof sessionHeader === 'string' ? sessionHeader.trim() : null;
  return cookieToken || bearer || headerToken || null;
}

export async function getUserFromSession(req: Request): Promise<User | null> {
  const credential = getSessionIdFromReq(req);
  if (!credential) return null;

  const db = await getDb();
  if (!isFirebaseIdToken(credential)) {
    const now = new Date().toISOString();
    const sessionRow = queryOne<any>(
      db,
      `SELECT s.id as session_id, s.expires_at, u.*
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = ? AND s.expires_at > ?`,
      [credential, now],
    );
    if (sessionRow) {
      return formatSafeUser(sessionRow);
    }
    return null;
  }

  let claims: VerifiedFirebaseClaims;
  try {
    claims = await verifyFirebaseIdToken(credential);
  } catch (error) {
    if (error instanceof FirebaseTokenVerificationUnavailable) throw error;
    return null;
  }

  const byUid = queryOne<any>(db, 'SELECT * FROM users WHERE firebase_uid = ?', [claims.sub]);
  const byEmail = queryOne<any>(db, 'SELECT * FROM users WHERE LOWER(email) = ?', [claims.email]);
  if (byUid && byEmail && byUid.id !== byEmail.id) return null;
  const userRow = byUid || byEmail;
  return userRow ? formatSafeUser(userRow) : null;
}

export async function destroySession(req: Request, res?: Response): Promise<void> {
  const authorization = req.headers.authorization;
  const bearer = typeof authorization === 'string' ? authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() : null;
  const sessionHeader = req.headers['x-session-token'];
  const headerToken = typeof sessionHeader === 'string' ? sessionHeader.trim() : null;
  const cookieToken = req.cookies?.[SESSION_COOKIE_NAME];
  const candidates = [...new Set([cookieToken, bearer, headerToken].filter((value): value is string => !!value))];

  if (candidates.some((value) => !isFirebaseIdToken(value))) {
    const db = await getDb();
    for (const value of candidates) {
      if (!isFirebaseIdToken(value)) execute(db, 'DELETE FROM sessions WHERE id = ?', [value]);
    }
  }

  if (res) {
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? 'none' : 'lax',
      path: '/',
    });
  }
}
