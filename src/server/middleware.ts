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

      // If query param token was not provided, but the request accepts HTML,
      // provide a client-side localStorage bridge to prevent iframe cookie loss
      if (!req.query?.token && req.accepts('html')) {
        res.status(200).send(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Connecting to LAST ATTEMPT Study Companion...</title>
  </head>
  <body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#fbf9f5;display:flex;align-items:center;justify-content:center;height:100vh;">
    <div style="text-align:center;padding:28px 36px;background:#ffffff;border:1px solid #e7e5e4;border-radius:20px;box-shadow:0 4px 20px rgba(0,0,0,0.06);max-width:360px;">
      <div style="width:40px;height:40px;border:3px solid #830e0d;border-top-color:transparent;border-radius:50%;margin:0 auto 16px;animation:spin 0.8s linear infinite;"></div>
      <div style="font-weight:800;color:#1c1917;font-size:16px;margin-bottom:6px;">Connecting to Study Portal...</div>
      <div style="color:#78716c;font-size:12px;">Validating active session credentials</div>
    </div>
    <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    <script>
      (function() {
        try {
          var token = localStorage.getItem('last_attempt_token');
          if (token) {
            window.location.replace('/study?token=' + encodeURIComponent(token));
            return;
          }
        } catch(e) {}
        window.location.replace('/?error=unauthenticated');
      })();
    </script>
  </body>
</html>`);
        return;
      }

      res.redirect('/?error=unauthenticated');
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
