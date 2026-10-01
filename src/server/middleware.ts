import { Request, Response, NextFunction } from 'express';
import { FirebaseTokenVerificationUnavailable, getUserFromSession } from './auth.js';
import { User } from '../types.js';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function isAccessExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false; // Lifetime / No Expiry
  const expiry = new Date(expiresAt).getTime();
  return !Number.isFinite(expiry) || expiry < Date.now();
}

export async function requireAuthenticatedUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await getUserFromSession(req);
    const isApi = (req.originalUrl || req.url || req.path).startsWith('/api/');
    if (!user) {
      if (isApi) {
        res.status(401).json({ error: 'Authentication required. Please log in.' });
        return;
      }
      res.redirect('/?error=unauthenticated');
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Error in requireAuthenticatedUser middleware:', err);
    const status = err instanceof FirebaseTokenVerificationUnavailable ? 503 : 500;
    res.status(status).json({ error: 'Internal server authorization error' });
  }
}

export async function requireActiveStudyAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await getUserFromSession(req);
    const isApi = (req.originalUrl || req.url || req.path).startsWith('/api/');
    if (!user) {
      if (isApi) {
        res.status(401).json({ error: 'Authentication required to access study materials.' });
        return;
      }
      res.redirect('/?session=expired');
      return;
    }

    req.user = user;

    // Authentication and admin role do not bypass study access status or expiry.
    if (user.access_status === 'pending') {
      if (isApi) {
        res.status(403).json({ error: 'Your account is pending administrator approval.', status: 'pending' });
        return;
      }
      res.redirect('/?error=pending');
      return;
    }

    if (user.access_status === 'revoked') {
      if (isApi) {
        res.status(403).json({ error: 'Your access has been revoked.', status: 'revoked' });
        return;
      }
      res.redirect('/?error=revoked');
      return;
    }

    if (user.access_status !== 'active') {
      const status = String(user.access_status) === 'expired' ? 'expired' : 'revoked';
      if (isApi) {
        res.status(403).json({ error: 'Study access is not active.', status });
        return;
      }
      res.redirect(`/?error=${status}`);
      return;
    }

    // Check expiry
    if (isAccessExpired(user.access_expires_at)) {
      if (isApi) {
        res.status(403).json({ error: 'Your study access has expired. Please request an extension.', status: 'expired' });
        return;
      }
      res.redirect('/?error=expired');
      return;
    }

    next();
  } catch (err) {
    console.error('Error in requireActiveStudyAccess middleware:', err);
    const status = err instanceof FirebaseTokenVerificationUnavailable ? 503 : 500;
    res.status(status).json({ error: 'Internal server authorization error' });
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await getUserFromSession(req);
    const isApi = (req.originalUrl || req.url || req.path).startsWith('/api/');
    if (!user) {
      if (isApi) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }
      res.redirect('/?error=unauthenticated');
      return;
    }

    req.user = user;

    if (user.role !== 'admin') {
      if (isApi) {
        res.status(403).json({ error: 'Forbidden: Admin authorization required.' });
        return;
      }
      res.redirect('/?error=unauthorized_admin');
      return;
    }

    next();
  } catch (err) {
    console.error('Error in requireAdmin middleware:', err);
    const status = err instanceof FirebaseTokenVerificationUnavailable ? 503 : 500;
    res.status(status).json({ error: 'Internal server authorization error' });
  }
}
