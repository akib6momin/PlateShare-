const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// Helper to calculate Haversine distance in kilometers
function getDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round((R * c) * 10) / 10;
}

/**
 * GET /api/posts
 * Feed of available food only.
 * STAGE 1 HIDE (INSTANT): Enforced strictly on server:
 * status = 'available' AND expires_at > nowIso AND is_flagged = 0
 * Sorted by soonest expiry (expires_at ASC)
 */
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const nowIso = new Date().toISOString();
    const { donor_type, food_type, min_servings, user_lat, user_lng, max_distance } = req.query;

    let query = `
      SELECT p.*, u.rating_avg AS donor_rating, u.verification_status AS donor_verification_status
      FROM food_posts p
      JOIN users u ON p.donor_id = u.id
      WHERE p.status = 'available' 
        AND p.expires_at > ?
        AND p.is_flagged = 0
    `;
    const params = [nowIso];

    if (donor_type && donor_type !== 'all') {
      query += ` AND p.donor_type = ?`;
      params.push(donor_type);
    }

    if (food_type && food_type !== 'all') {
      query += ` AND p.food_type = ?`;
      params.push(food_type);
    }

    if (min_servings) {
      query += ` AND p.servings >= ?`;
      params.push(parseInt(min_servings, 10));
    }

    query += ` ORDER BY p.expires_at ASC`;

    let rows = db.all(query, params);

    // Parse allergens and compute distances
    const parsedRows = rows.map(post => {
      let parsedAllergens = [];
      try {
        parsedAllergens = post.allergens ? JSON.parse(post.allergens) : [];
      } catch (e) {
        parsedAllergens = [];
      }

      let distance = null;
      if (user_lat && user_lng && post.latitude && post.longitude) {
        distance = getDistanceKm(
          parseFloat(user_lat),
          parseFloat(user_lng),
          parseFloat(post.latitude),
          parseFloat(post.longitude)
        );
      }

      // Calculate minutes remaining
      const expiryDate = new Date(post.expires_at);
      const minutesRemaining = Math.max(0, Math.floor((expiryDate.getTime() - Date.now()) / 60000));

      return {
        ...post,
        allergens: parsedAllergens,
        distance_km: distance,
        minutes_remaining: minutesRemaining,
        is_urgent: minutesRemaining <= 30 // Highlight in amber when < 30m
      };
    });

    // Apply distance filter if requested
    let finalResults = parsedRows;
    if (max_distance && user_lat && user_lng) {
      const maxDist = parseFloat(max_distance);
      finalResults = finalResults.filter(p => p.distance_km === null || p.distance_km <= maxDist);
    }

    res.json({
      success: true,
      count: finalResults.length,
      server_time: nowIso,
      posts: finalResults
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/posts
 * Create a new food post with calculated expiry
 */
router.post('/', async (req, res) => {
  try {
    const db = await getDb();
    const {
      donor_id,
      donor_name,
      donor_type,
      contact_phone,
      food_item,
      servings,
      food_type,
      packaging,
      pickup_address,
      notes,
      photo_url,
      safe_duration_hours,
      cooked_at,
      allergens,
      freshness_confirmed,
      latitude,
      longitude
    } = req.body;

    if (!donor_id || !food_item || !servings || !food_type || !packaging || !pickup_address || !safe_duration_hours) {
      return res.status(400).json({ success: false, error: 'Required fields missing' });
    }

    if (!freshness_confirmed) {
      return res.status(400).json({
        success: false,
        error: 'Safety pledge required: You must confirm the food was freshly prepared and is safe to eat.'
      });
    }

    // Hard maximum of 6 hours
    const durationHours = parseFloat(safe_duration_hours);
    if (durationHours > 6) {
      return res.status(400).json({ success: false, error: 'Safety policy violation: Safe duration cannot exceed 6 hours.' });
    }

    const now = new Date();
    const nowIso = now.toISOString();

    // Expiry calculation:
    // If cooked_at is provided, expiry = cooked_at + duration.
    // So food cooked 2 hours ago gets less time than food cooked just now.
    // If cooked_at is not provided, expiry = posted_at + duration.
    let baseTime = now.getTime();
    if (cooked_at) {
      const parsedCookedAt = new Date(cooked_at).getTime();
      if (!isNaN(parsedCookedAt) && parsedCookedAt <= now.getTime()) {
        baseTime = parsedCookedAt;
      }
    }

    const durationMs = durationHours * 60 * 60 * 1000;
    const expiresAtDate = new Date(baseTime + durationMs);

    // If calculated expiry is already in the past, disallow
    if (expiresAtDate.getTime() <= now.getTime()) {
      return res.status(400).json({
        success: false,
        error: 'The calculated expiry based on cooked time has already passed! Food must be safe to eat at time of posting.'
      });
    }

    const expiresAtIso = expiresAtDate.toISOString();

    // Check donor verification
    const donor = db.get('SELECT verification_status, is_org FROM users WHERE id = ?', [donor_id]);
    const donorVerified = donor && donor.verification_status === 'approved' ? 1 : 0;

    const allergensJson = JSON.stringify(allergens || []);

    const result = db.run(
      `INSERT INTO food_posts (
        donor_id, donor_name, donor_type, donor_verified, contact_phone, 
        food_item, servings, food_type, packaging, pickup_address, notes, 
        photo_url, safe_duration_hours, cooked_at, posted_at, expires_at, 
        allergens, freshness_confirmed, status, latitude, longitude, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', ?, ?, ?, ?)`,
      [
        donor_id,
        donor_name,
        donor_type,
        donorVerified,
        contact_phone,
        food_item,
        parseInt(servings, 10),
        food_type,
        packaging,
        pickup_address,
        notes || '',
        photo_url || null,
        durationHours,
        cooked_at || nowIso,
        nowIso,
        expiresAtIso,
        allergensJson,
        1,
        latitude || 19.0760,
        longitude || 72.8777,
        nowIso,
        nowIso
      ]
    );

    const newPost = db.get('SELECT * FROM food_posts WHERE id = ?', [result.lastInsertRowid]);

    // Broadcast in-app notification to active receivers/NGOs nearby
    const receivers = db.all(`SELECT id FROM users WHERE role = 'receiver'`);
    for (const r of receivers) {
      db.run(
        `INSERT INTO notifications (user_id, title, message, type, link, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          r.id,
          'New Food Donation Available!',
          `${servings} servings of ${food_item} just posted by ${donor_name}.`,
          'alert',
          '/',
          nowIso
        ]
      );
    }

    res.status(201).json({
      success: true,
      post: {
        ...newPost,
        allergens: allergens || []
      },
      message: 'Food posted successfully!'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/posts/my-posts
 * Donor's posts grouped with status
 */
router.get('/my-posts', async (req, res) => {
  try {
    const db = await getDb();
    const donorId = req.query.donor_id;
    if (!donorId) {
      return res.status(400).json({ success: false, error: 'donor_id is required' });
    }

    const posts = db.all(
      `SELECT p.*, 
              b.id AS booking_id, b.receiver_name, b.receiver_phone, b.booked_at, b.status AS booking_status
       FROM food_posts p
       LEFT JOIN bookings b ON p.id = b.post_id
       WHERE p.donor_id = ?
       ORDER BY p.id DESC`,
      [donorId]
    );

    const nowIso = new Date().toISOString();

    const formatted = posts.map(p => {
      let allergens = [];
      try {
        allergens = p.allergens ? JSON.parse(p.allergens) : [];
      } catch (e) {
        allergens = [];
      }

      // Check if available post has passed expires_at
      let effectiveStatus = p.status;
      if (p.status === 'available' && p.expires_at <= nowIso) {
        effectiveStatus = 'expired';
      }

      return {
        ...p,
        allergens,
        effective_status: effectiveStatus,
        is_past_expiry: p.expires_at <= nowIso
      };
    });

    res.json({ success: true, posts: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/posts/last
 * Returns donor's last post to power the "Repeat last post" button
 */
router.get('/last', async (req, res) => {
  try {
    const db = await getDb();
    const donorId = req.query.donor_id;
    if (!donorId) {
      return res.status(400).json({ success: false, error: 'donor_id is required' });
    }

    const post = db.get(
      `SELECT * FROM food_posts WHERE donor_id = ? ORDER BY id DESC LIMIT 1`,
      [donorId]
    );

    if (!post) {
      return res.json({ success: false, message: 'No previous post found' });
    }

    let allergens = [];
    try {
      allergens = post.allergens ? JSON.parse(post.allergens) : [];
    } catch (e) {
      allergens = [];
    }

    res.json({
      success: true,
      post: {
        ...post,
        allergens
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/posts/:id/cancel
 * Manually remove a live post
 */
router.post('/:id/cancel', async (req, res) => {
  try {
    const db = await getDb();
    const postId = req.params.id;
    const { donor_id } = req.body;

    const post = db.get('SELECT * FROM food_posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    if (donor_id && post.donor_id != donor_id) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    if (post.status === 'booked') {
      return res.status(400).json({ success: false, error: 'Cannot cancel an already booked post. Please contact the receiver.' });
    }

    db.run(`UPDATE food_posts SET status = 'cancelled', updated_at = ? WHERE id = ?`, [
      new Date().toISOString(),
      postId
    ]);

    res.json({ success: true, message: 'Post removed from feed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/posts/:id/collected
 * Mark booked post as "Collected"
 */
router.post('/:id/collected', async (req, res) => {
  try {
    const db = await getDb();
    const postId = req.params.id;
    const nowIso = new Date().toISOString();

    const post = db.get('SELECT * FROM food_posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const booking = db.get('SELECT * FROM bookings WHERE post_id = ? AND status = ' + "'active'", [postId]);

    db.run(`UPDATE food_posts SET status = 'collected', updated_at = ? WHERE id = ?`, [nowIso, postId]);
    if (booking) {
      db.run(`UPDATE bookings SET status = 'collected', collected_at = ? WHERE id = ?`, [nowIso, booking.id]);

      // Notify receiver that food was marked collected and prompt for rating
      db.run(
        `INSERT INTO notifications (user_id, title, message, type, link, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          booking.receiver_id,
          'Donation Collected!',
          `"${post.food_item}" has been marked collected. Please leave a rating for ${post.donor_name}!`,
          'rating',
          '/my-bookings',
          nowIso
        ]
      );

      // Notify donor to rate receiver
      db.run(
        `INSERT INTO notifications (user_id, title, message, type, link, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          post.donor_id,
          'Food Handed Over!',
          `Great job! Please rate receiver ${booking.receiver_name}.`,
          'rating',
          '/my-posts',
          nowIso
        ]
      );
    }

    // Archive immediately to impact summaries as collected
    const eventDate = nowIso.split('T')[0];
    db.run(
      `INSERT INTO impact_summaries (post_id, donor_id, donor_type, food_type, servings, outcome, event_date, created_at)
       VALUES (?, ?, ?, ?, ?, 'collected', ?, ?)`,
      [post.id, post.donor_id, post.donor_type, post.food_type, post.servings, eventDate, nowIso]
    );

    res.json({ success: true, message: 'Post marked as collected! Impact recorded.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/posts/:id/report
 * Report a post (spoiled food, wrong address, fake donor).
 * 3 reports hide the post and flag the donor for admin review!
 */
router.post('/:id/report', async (req, res) => {
  try {
    const db = await getDb();
    const postId = req.params.id;
    const { reporter_id, reporter_name, reason, details } = req.body;

    if (!reporter_id || !reason) {
      return res.status(400).json({ success: false, error: 'Reporter ID and reason required' });
    }

    const post = db.get('SELECT * FROM food_posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    const nowIso = new Date().toISOString();

    // Insert report
    db.run(
      `INSERT INTO reports (post_id, donor_id, reporter_id, reporter_name, reason, details, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'open', ?)`,
      [postId, post.donor_id, reporter_id, reporter_name || 'Anonymous', reason, details || '', nowIso]
    );

    // Update report count
    const newReportCount = (post.report_count || 0) + 1;
    let isFlagged = post.is_flagged;

    if (newReportCount >= 3) {
      isFlagged = 1;
      // Also notify admins
      const admins = db.all(`SELECT id FROM users WHERE role = 'admin'`);
      for (const adm of admins) {
        db.run(
          `INSERT INTO notifications (user_id, title, message, type, link, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            adm.id,
            '🚨 Post Auto-Flagged (3 Reports)',
            `Post #${post.id} ("${post.food_item}") by donor "${post.donor_name}" received 3 reports and has been automatically hidden from feed. Please review!`,
            'report',
            '/admin',
            nowIso
          ]
        );
      }
    }

    db.run(
      `UPDATE food_posts SET report_count = ?, is_flagged = ?, updated_at = ? WHERE id = ?`,
      [newReportCount, isFlagged, nowIso, postId]
    );

    res.json({
      success: true,
      message: newReportCount >= 3
        ? 'Report submitted. Due to multiple reports, this post has been temporarily hidden for admin review.'
        : 'Report submitted for review. Thank you for keeping Plate Share safe.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
