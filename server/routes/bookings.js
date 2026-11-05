const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

/**
 * POST /api/bookings
 * Book food with STRICT DOUBLE-BOOKING PREVENTION (Atomic Transaction)
 */
router.post('/', async (req, res) => {
  try {
    const db = await getDb();
    const { post_id, receiver_id, receiver_name, receiver_phone, notes } = req.body;

    if (!post_id || !receiver_id || !receiver_name || !receiver_phone) {
      return res.status(400).json({ success: false, error: 'Missing required booking details' });
    }

    const nowIso = new Date().toISOString();

    // Execute within SQLite transaction to ensure atomic row check and lock
    let bookingResult = null;
    let postDetails = null;

    try {
      bookingResult = db.transaction(() => {
        // Step 1: Check current post state inside the transaction
        const post = db.get(
          `SELECT * FROM food_posts WHERE id = ?`,
          [post_id]
        );

        if (!post) {
          throw new Error('NOT_FOUND: Food listing not found.');
        }

        // Must be status = 'available'
        if (post.status !== 'available') {
          throw new Error('ALREADY_BOOKED: This food listing has already been booked by another user.');
        }

        // Must not be expired
        if (post.expires_at <= nowIso) {
          throw new Error('EXPIRED: This food listing has just expired and is no longer safe to claim.');
        }

        // Must not be flagged
        if (post.is_flagged === 1) {
          throw new Error('FLAGGED: This listing is currently unavailable under safety review.');
        }

        // Step 2: Atomic update - strictly conditions on status = 'available'
        const updateRes = db.run(
          `UPDATE food_posts SET status = 'booked', updated_at = ? WHERE id = ? AND status = 'available'`,
          [nowIso, post_id]
        );

        if (updateRes.changes === 0) {
          // Another concurrent request beat us to it!
          throw new Error('ALREADY_BOOKED: This food listing was just booked a split second ago by another receiver.');
        }

        // Step 3: Insert booking record
        const insertRes = db.run(
          `INSERT INTO bookings (
            post_id, receiver_id, receiver_name, receiver_phone, booked_at, status, 
            pickup_address, donor_contact
          ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
          [
            post.id,
            receiver_id,
            receiver_name,
            receiver_phone,
            nowIso,
            post.pickup_address,
            post.contact_phone
          ]
        );

        // Step 4: Notifications
        // Donor notification: "Your food is booked"
        db.run(
          `INSERT INTO notifications (user_id, title, message, type, link, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            post.donor_id,
            '🎉 Food Booked!',
            `${receiver_name} (${receiver_phone}) booked your "${post.food_item}". Please keep it ready for pickup at ${post.pickup_address}.`,
            'booking',
            '/my-posts',
            nowIso
          ]
        );

        // Receiver notification: Pickup details confirmation
        db.run(
          `INSERT INTO notifications (user_id, title, message, type, link, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            receiver_id,
            '✅ Pickup Details Confirmed',
            `You booked "${post.food_item}". Pickup from ${post.pickup_address}. Contact donor ${post.donor_name} at ${post.contact_phone}. Note: Check food freshness before eating!`,
            'pickup',
            '/my-bookings',
            nowIso
          ]
        );

        postDetails = post;
        return { bookingId: insertRes.lastInsertRowid, post };
      });
    } catch (txErr) {
      if (txErr.message.startsWith('ALREADY_BOOKED')) {
        return res.status(409).json({
          success: false,
          error: 'Already booked! Another receiver claimed this food just now.'
        });
      }
      if (txErr.message.startsWith('EXPIRED')) {
        return res.status(410).json({
          success: false,
          error: 'This listing has expired and cannot be booked.'
        });
      }
      return res.status(400).json({ success: false, error: txErr.message });
    }

    res.status(201).json({
      success: true,
      booking_id: bookingResult.bookingId,
      post: postDetails,
      pickup_address: postDetails.pickup_address,
      donor_contact: postDetails.contact_phone,
      message: 'Booking successful! The food has been reserved exclusively for you.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/bookings/my-bookings
 * Receiver's bookings list
 */
router.get('/my-bookings', async (req, res) => {
  try {
    const db = await getDb();
    const receiverId = req.query.receiver_id;
    if (!receiverId) {
      return res.status(400).json({ success: false, error: 'receiver_id is required' });
    }

    const bookings = db.all(
      `SELECT b.*, 
              p.food_item, p.servings, p.food_type, p.packaging, p.notes, 
              p.photo_url, p.expires_at, p.allergens, p.donor_name, p.donor_type,
              p.status AS post_status,
              r.rating AS user_given_rating
       FROM bookings b
       JOIN food_posts p ON b.post_id = p.id
       LEFT JOIN ratings r ON r.booking_id = b.id AND r.from_user_id = b.receiver_id
       WHERE b.receiver_id = ?
       ORDER BY b.id DESC`,
      [receiverId]
    );

    const nowIso = new Date().toISOString();

    const formatted = bookings.map(b => {
      let allergens = [];
      try {
        allergens = b.allergens ? JSON.parse(b.allergens) : [];
      } catch (e) {
        allergens = [];
      }

      const expiryDate = new Date(b.expires_at);
      const minutesRemaining = Math.max(0, Math.floor((expiryDate.getTime() - Date.now()) / 60000));

      return {
        ...b,
        allergens,
        minutes_remaining: minutesRemaining,
        is_past_expiry: b.expires_at <= nowIso
      };
    });

    res.json({ success: true, bookings: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
