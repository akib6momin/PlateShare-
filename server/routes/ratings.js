const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

/**
 * POST /api/ratings
 * Two-way ratings after collection:
 * Donor rates receiver, receiver rates donor
 */
router.post('/', async (req, res) => {
  try {
    const db = await getDb();
    const { booking_id, from_user_id, to_user_id, direction, rating, comment } = req.body;

    if (!booking_id || !from_user_id || !to_user_id || !direction || !rating) {
      return res.status(400).json({ success: false, error: 'Missing rating information' });
    }

    const ratingNum = parseInt(rating, 10);
    if (ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
    }

    // Check if already rated for this booking in this direction
    const existing = db.get(
      `SELECT id FROM ratings WHERE booking_id = ? AND from_user_id = ?`,
      [booking_id, from_user_id]
    );

    if (existing) {
      return res.status(400).json({ success: false, error: 'You have already rated for this donation.' });
    }

    const nowIso = new Date().toISOString();

    db.run(
      `INSERT INTO ratings (booking_id, from_user_id, to_user_id, direction, rating, comment, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [booking_id, from_user_id, to_user_id, direction, ratingNum, comment || '', nowIso]
    );

    // Recalculate target user's rating_avg and rating_count
    const userRatings = db.all(`SELECT rating FROM ratings WHERE to_user_id = ?`, [to_user_id]);
    const count = userRatings.length;
    const sum = userRatings.reduce((acc, curr) => acc + curr.rating, 0);
    const avg = count > 0 ? Math.round((sum / count) * 10) / 10 : 5.0;

    db.run(
      `UPDATE users SET rating_avg = ?, rating_count = ? WHERE id = ?`,
      [avg, count, to_user_id]
    );

    // Notify recipient of new rating
    const fromUser = db.get('SELECT name FROM users WHERE id = ?', [from_user_id]);
    db.run(
      `INSERT INTO notifications (user_id, title, message, type, link, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        to_user_id,
        '⭐ New Rating Received!',
        `${fromUser ? fromUser.name : 'A member'} gave you a ${ratingNum}-star rating: "${comment || 'Positive donation experience'}"`,
        'rating',
        '/',
        nowIso
      ]
    );

    res.status(201).json({
      success: true,
      new_rating_avg: avg,
      new_rating_count: count,
      message: 'Rating submitted! Thank you for fostering a trusted community.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/ratings/user/:id
 * Retrieve ratings received by a specific user
 */
router.get('/user/:id', async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.params.id;

    const ratings = db.all(
      `SELECT r.*, u.name as reviewer_name, u.role as reviewer_role
       FROM ratings r
       JOIN users u ON r.from_user_id = u.id
       WHERE r.to_user_id = ?
       ORDER BY r.id DESC`,
      [userId]
    );

    res.json({ success: true, ratings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
