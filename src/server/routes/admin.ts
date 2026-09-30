import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, queryAll, queryOne, execute } from '../../db/index.js';
import { requireAdmin } from '../middleware.js';
import { formatSafeUser } from '../auth.js';
import { GatewayInfo, NewUserPolicy, NotificationCategory } from '../../types.js';

export const adminRouter = Router();

// Apply requireAdmin to ALL admin routes
adminRouter.use(requireAdmin);

// ================= USER MANAGEMENT =================

// List all users
adminRouter.get('/users', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const rows = queryAll(
      db,
      "SELECT * FROM users WHERE email NOT LIKE '%@example.com' AND email != 'admin@lastattempt.com' ORDER BY created_at DESC"
    );
    res.json({ users: rows.map(formatSafeUser) });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user access status and expiry
adminRouter.patch('/users/:id/access', async (req: Request, res: Response) => {
  try {
    const targetUserId = req.params.id;
    const currentAdmin = req.user!;
    const { access_status, access_expires_at, add_days, set_lifetime } = req.body;

    const db = await getDb();
    const targetUser = queryOne(db, 'SELECT * FROM users WHERE id = ?', [targetUserId]);

    if (!targetUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Protection for admin accounts
    if (targetUser.role === 'admin' && access_status === 'revoked') {
      res.status(400).json({ error: 'Admin accounts cannot be revoked. Demote the user first.' });
      return;
    }

    let newStatus = access_status ?? targetUser.access_status;
    let newExpiresAt: string | null = targetUser.access_expires_at;

    if (set_lifetime === true) {
      newExpiresAt = null;
    } else if (typeof add_days === 'number' && add_days > 0) {
      const baseDate = targetUser.access_expires_at && new Date(targetUser.access_expires_at).getTime() > Date.now()
        ? new Date(targetUser.access_expires_at)
        : new Date();
      newExpiresAt = new Date(baseDate.getTime() + add_days * 24 * 60 * 60 * 1000).toISOString();
    } else if (access_expires_at !== undefined) {
      newExpiresAt = access_expires_at ? new Date(access_expires_at).toISOString() : null;
    }

    const nowIso = new Date().toISOString();
    execute(
      db,
      'UPDATE users SET access_status = ?, access_expires_at = ?, updated_at = ? WHERE id = ?',
      [newStatus, newExpiresAt, nowIso, targetUserId]
    );

    const updatedUser = queryOne(db, 'SELECT * FROM users WHERE id = ?', [targetUserId]);
    res.json({ user: formatSafeUser(updatedUser) });
  } catch (err) {
    console.error('Admin update user access error:', err);
    res.status(500).json({ error: 'Failed to update user access' });
  }
});

// Update user role
adminRouter.patch('/users/:id/role', async (req: Request, res: Response) => {
  try {
    const targetUserId = req.params.id;
    const currentAdmin = req.user!;
    const { role } = req.body;

    if (role !== 'user' && role !== 'admin') {
      res.status(400).json({ error: 'Invalid role specified. Must be user or admin.' });
      return;
    }

    if (targetUserId === currentAdmin.id && role === 'user') {
      res.status(400).json({ error: 'You cannot remove your own admin privileges.' });
      return;
    }

    const db = await getDb();
    const targetUser = queryOne(db, 'SELECT * FROM users WHERE id = ?', [targetUserId]);

    if (!targetUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const nowIso = new Date().toISOString();
    execute(
      db,
      'UPDATE users SET role = ?, updated_at = ? WHERE id = ?',
      [role, nowIso, targetUserId]
    );

    const updatedUser = queryOne(db, 'SELECT * FROM users WHERE id = ?', [targetUserId]);
    res.json({ user: formatSafeUser(updatedUser) });
  } catch (err) {
    console.error('Admin update role error:', err);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Delete user (with protection against deleting admins)
adminRouter.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const targetUserId = req.params.id;
    const currentAdmin = req.user!;

    if (targetUserId === currentAdmin.id) {
      res.status(400).json({ error: 'You cannot delete your own account.' });
      return;
    }

    const db = await getDb();
    const targetUser = queryOne(db, 'SELECT * FROM users WHERE id = ?', [targetUserId]);

    if (!targetUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (targetUser.role === 'admin') {
      res.status(400).json({ error: 'Admin accounts are protected and cannot be deleted.' });
      return;
    }

    execute(db, 'DELETE FROM users WHERE id = ?', [targetUserId]);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ================= NEW USER ACCESS POLICY =================

adminRouter.get('/policy', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const row = queryOne(db, "SELECT value FROM settings WHERE key = 'new_user_policy'");
    res.json({ policy: row?.value || 'auto_3_months' });
  } catch (err) {
    console.error('Admin policy error:', err);
    res.status(500).json({ error: 'Failed to fetch policy' });
  }
});

adminRouter.put('/policy', async (req: Request, res: Response) => {
  try {
    const { policy } = req.body;
    const validPolicies: NewUserPolicy[] = ['auto_3_months', 'auto_1_month', 'approval_required'];

    if (!validPolicies.includes(policy)) {
      res.status(400).json({ error: 'Invalid policy. Must be auto_3_months, auto_1_month, or approval_required.' });
      return;
    }

    const db = await getDb();
    execute(
      db,
      "INSERT INTO settings (key, value) VALUES ('new_user_policy', ?) ON CONFLICT(key) DO UPDATE SET value = ?",
      [policy, policy]
    );

    res.json({ success: true, policy });
  } catch (err) {
    console.error('Admin update policy error:', err);
    res.status(500).json({ error: 'Failed to update policy' });
  }
});

// ================= EXTENSION REQUESTS =================

adminRouter.get('/extensions', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const rows = queryAll(
      db,
      `SELECT e.*, u.name as user_name, u.email as user_email
       FROM extension_requests e
       JOIN users u ON e.user_id = u.id
       ORDER BY e.created_at DESC`
    );
    res.json({ requests: rows });
  } catch (err) {
    console.error('Admin extensions error:', err);
    res.status(500).json({ error: 'Failed to fetch extension requests' });
  }
});

adminRouter.post('/extensions/:id/review', async (req: Request, res: Response) => {
  try {
    const reqId = req.params.id;
    const currentAdmin = req.user!;
    const { action, extend_days = 30, no_expiry = false } = req.body;

    if (action !== 'approve' && action !== 'decline') {
      res.status(400).json({ error: 'Action must be approve or decline' });
      return;
    }

    const db = await getDb();
    const extRequest = queryOne(db, 'SELECT * FROM extension_requests WHERE id = ?', [reqId]);

    if (!extRequest) {
      res.status(404).json({ error: 'Extension request not found' });
      return;
    }

    const nowIso = new Date().toISOString();

    if (action === 'approve') {
      const user = queryOne(db, 'SELECT * FROM users WHERE id = ?', [extRequest.user_id]);
      if (user) {
        let newExpiresAt: string | null = null;
        if (!no_expiry) {
          const baseDate = user.access_expires_at && new Date(user.access_expires_at).getTime() > Date.now()
            ? new Date(user.access_expires_at)
            : new Date();
          newExpiresAt = new Date(baseDate.getTime() + extend_days * 24 * 60 * 60 * 1000).toISOString();
        }

        execute(
          db,
          'UPDATE users SET access_status = ?, access_expires_at = ?, updated_at = ? WHERE id = ?',
          ['active', newExpiresAt, nowIso, user.id]
        );
      }

      execute(
        db,
        'UPDATE extension_requests SET status = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ?',
        ['approved', nowIso, currentAdmin.name, reqId]
      );
    } else {
      execute(
        db,
        'UPDATE extension_requests SET status = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ?',
        ['declined', nowIso, currentAdmin.name, reqId]
      );
    }

    res.json({ success: true, action });
  } catch (err) {
    console.error('Admin review extension error:', err);
    res.status(500).json({ error: 'Failed to process extension review' });
  }
});

// ================= GATEWAY INFORMATION BOX =================

adminRouter.put('/gateway-info', async (req: Request, res: Response) => {
  try {
    const { visible, heading, message, whatsapp, email, pricing, additional_notes } = req.body;

    const info: GatewayInfo = {
      visible: Boolean(visible),
      heading: String(heading || '').trim(),
      message: String(message || '').trim(),
      whatsapp: String(whatsapp || '').trim(),
      email: String(email || '').trim(),
      pricing: String(pricing || '').trim(),
      additional_notes: String(additional_notes || '').trim(),
    };

    const db = await getDb();
    execute(
      db,
      "INSERT INTO settings (key, value) VALUES ('gateway_info', ?) ON CONFLICT(key) DO UPDATE SET value = ?",
      [JSON.stringify(info), JSON.stringify(info)]
    );

    res.json({ success: true, info });
  } catch (err) {
    console.error('Admin update gateway info error:', err);
    res.status(500).json({ error: 'Failed to update gateway information' });
  }
});

// ================= NOTIFICATIONS MANAGEMENT =================

// List notifications with detailed read-tracking
adminRouter.get('/notifications', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const notifs = queryAll(db, 'SELECT * FROM notifications ORDER BY created_at DESC');

    const result = notifs.map(n => {
      const readRows = queryAll(
        db,
        `SELECT r.read_at, u.id as user_id, u.name, u.email
         FROM notification_reads r
         JOIN users u ON r.user_id = u.id
         WHERE r.notification_id = ?
         ORDER BY r.read_at DESC`,
        [n.id]
      );

      return {
        ...n,
        is_active: Boolean(n.is_active),
        read_count: readRows.length,
        read_by_users: readRows,
      };
    });

    res.json({ notifications: result });
  } catch (err) {
    console.error('Admin get notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch admin notifications' });
  }
});

// Create new notification
adminRouter.post('/notifications', async (req: Request, res: Response) => {
  try {
    const currentAdmin = req.user!;
    const { title, category, message, is_active = true } = req.body;

    const validCategories: NotificationCategory[] = ['New Content', 'Update', 'Important', 'General'];
    if (!validCategories.includes(category)) {
      res.status(400).json({ error: 'Category must be one of: New Content, Update, Important, General' });
      return;
    }

    if (!title || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'Message content is required' });
      return;
    }

    const notifId = uuidv4();
    const nowIso = new Date().toISOString();
    const db = await getDb();

    execute(
      db,
      `INSERT INTO notifications (id, title, category, message, is_active, created_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [notifId, title.trim(), category, message.trim(), is_active ? 1 : 0, nowIso, currentAdmin.name]
    );

    res.status(201).json({ success: true, id: notifId });
  } catch (err) {
    console.error('Admin create notification error:', err);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Toggle notification active state
adminRouter.patch('/notifications/:id/toggle', async (req: Request, res: Response) => {
  try {
    const notifId = req.params.id;
    const db = await getDb();
    const notif = queryOne(db, 'SELECT is_active FROM notifications WHERE id = ?', [notifId]);

    if (!notif) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    const nextState = notif.is_active ? 0 : 1;
    execute(db, 'UPDATE notifications SET is_active = ? WHERE id = ?', [nextState, notifId]);

    res.json({ success: true, is_active: Boolean(nextState) });
  } catch (err) {
    console.error('Admin toggle notification error:', err);
    res.status(500).json({ error: 'Failed to toggle notification status' });
  }
});

// Delete notification
adminRouter.delete('/notifications/:id', async (req: Request, res: Response) => {
  try {
    const notifId = req.params.id;
    const db = await getDb();
    execute(db, 'DELETE FROM notifications WHERE id = ?', [notifId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Admin delete notification error:', err);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});
