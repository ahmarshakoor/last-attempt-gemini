import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, queryAll, queryOne, execute } from '../../db/index.js';
import { requireAuthenticatedUser } from '../middleware.js';

export const notificationsRouter = Router();

// Get active notifications for authenticated user
notificationsRouter.get('/', requireAuthenticatedUser, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const db = await getDb();

    const notifications = queryAll(
      db,
      `SELECT n.*,
              CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END as is_read
       FROM notifications n
       LEFT JOIN notification_reads r ON n.id = r.notification_id AND r.user_id = ?
       WHERE n.is_active = 1
       ORDER BY n.created_at DESC`,
      [user.id]
    );

    res.json({
      notifications: notifications.map(n => ({
        ...n,
        is_read: Boolean(n.is_read),
        is_active: Boolean(n.is_active),
      }))
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark single notification as read
notificationsRouter.post('/:id/read', requireAuthenticatedUser, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const notifId = req.params.id;
    const db = await getDb();

    // Check if notification exists
    const notif = queryOne(db, 'SELECT id FROM notifications WHERE id = ?', [notifId]);
    if (!notif) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    const readId = uuidv4();
    const nowIso = new Date().toISOString();

    // Insert or ignore if already read
    execute(
      db,
      `INSERT OR IGNORE INTO notification_reads (id, notification_id, user_id, read_at)
       VALUES (?, ?, ?, ?)`,
      [readId, notifId, user.id, nowIso]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all as read
notificationsRouter.post('/read-all', requireAuthenticatedUser, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const db = await getDb();

    const activeNotifs = queryAll(db, 'SELECT id FROM notifications WHERE is_active = 1');
    const nowIso = new Date().toISOString();

    for (const notif of activeNotifs) {
      const readId = uuidv4();
      execute(
        db,
        `INSERT OR IGNORE INTO notification_reads (id, notification_id, user_id, read_at)
         VALUES (?, ?, ?, ?)`,
        [readId, notif.id, user.id, nowIso]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error marking all as read:', err);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});
