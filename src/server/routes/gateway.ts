import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, queryOne, queryAll, execute } from '../../db/index.js';
import { requireAuthenticatedUser } from '../middleware.js';
import { GatewayInfo } from '../../types.js';

export const gatewayRouter = Router();

// Public gateway info
gatewayRouter.get('/info', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const row = queryOne(db, "SELECT value FROM settings WHERE key = 'gateway_info'");
    if (row && row.value) {
      try {
        const info: GatewayInfo = JSON.parse(row.value);
        res.json({ info });
        return;
      } catch (e) {
        // fallback
      }
    }

    res.json({
      info: {
        visible: true,
        heading: 'LAST ATTEMPT Medical Exam Companion',
        message: 'Welcome to Dr. Ahmar Shakoor’s official medical study portal for NRE 1 & 2 exam preparation.',
        whatsapp: '+92 300 0000000',
        email: 'drahmarshakoor@gmail.com',
        pricing: 'Standard 3-Month NRE Comprehensive Access',
        additional_notes: 'For subscription activation, extension requests, or group registration, contact Dr. Ahmar Shakoor via WhatsApp.'
      }
    });
  } catch (err) {
    console.error('Error fetching gateway info:', err);
    res.status(500).json({ error: 'Failed to fetch gateway info' });
  }
});

// Submit extension request
gatewayRouter.post('/extension-request', requireAuthenticatedUser, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { requested_duration, reason } = req.body;

    if (!requested_duration || typeof requested_duration !== 'string') {
      res.status(400).json({ error: 'Please specify the requested duration (e.g. 1 Month, 3 Months).' });
      return;
    }

    const db = await getDb();

    // Check if user already has a pending extension request
    const pending = queryOne(
      db,
      "SELECT id FROM extension_requests WHERE user_id = ? AND status = 'pending'",
      [user.id]
    );

    if (pending) {
      res.status(400).json({ error: 'You already have a pending extension request under administrator review.' });
      return;
    }

    const reqId = uuidv4();
    const nowIso = new Date().toISOString();

    execute(
      db,
      `INSERT INTO extension_requests (id, user_id, current_expiry, requested_duration, reason, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
      [reqId, user.id, user.access_expires_at, requested_duration, reason ? String(reason).trim() : null, nowIso]
    );

    res.status(201).json({ success: true, message: 'Extension request submitted successfully.' });
  } catch (err) {
    console.error('Error submitting extension request:', err);
    res.status(500).json({ error: 'Failed to submit extension request' });
  }
});

// Get current user's requests
gatewayRouter.get('/my-requests', requireAuthenticatedUser, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const db = await getDb();
    const requests = queryAll(
      db,
      'SELECT * FROM extension_requests WHERE user_id = ? ORDER BY created_at DESC',
      [user.id]
    );
    res.json({ requests });
  } catch (err) {
    console.error('Error fetching user requests:', err);
    res.status(500).json({ error: 'Failed to fetch extension requests' });
  }
});
