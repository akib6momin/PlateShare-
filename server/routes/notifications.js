const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

/**
 * GET /api/notifications
 * Fetch user notifications
 */
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.query.user_id;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }

    const notifications = db.all(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50`,
      [userId]
    );

    const unreadCount = db.get(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`,
      [userId]
    ).count;

    res.json({ success: true, unread_count: unreadCount, notifications });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/notifications/:id/read
 * Mark notification as read
 */
router.post('/:id/read', async (req, res) => {
  try {
    const db = await getDb();
    const notificationId = req.params.id;

    db.run(`UPDATE notifications SET is_read = 1 WHERE id = ?`, [notificationId]);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/notifications/read-all
 * Mark all notifications for a user as read
 */
router.post('/read-all', async (req, res) => {
  try {
    const db = await getDb();
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }

    db.run(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, [user_id]);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
