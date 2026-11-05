const cron = require('node-cron');
const { getDb } = require('./db');

// Configurable retention period in minutes for Stage 3 permanent deletion
// Default: 24 hours (1440 mins). Can be overridden via env or admin trigger (e.g. 5 mins for test mode).
let cleanupRetentionMinutes = parseInt(process.env.CLEANUP_RETENTION_MINUTES || '1440', 10);

/**
 * Stage 2: Mark Expired Job (Runs every minute)
 * 1. Changes any available post past its expires_at to status = 'expired'.
 * 2. Any active booked post not collected before expires_at is set to status = 'expired',
 *    booking status set to 'expired_uncollected', and both donor & receiver are notified.
 * 3. Reminds receivers if an active booking is > 1 hour old and uncollected.
 */
async function runExpiryCheck() {
  const db = await getDb();
  const nowIso = new Date().toISOString();
  let affectedCount = 0;
  const logs = [];

  // 1. Expire available posts past expires_at
  const expiredAvailable = db.all(
    `SELECT id, food_item, donor_id, donor_name FROM food_posts 
     WHERE status = 'available' AND expires_at <= ?`,
    [nowIso]
  );

  for (const post of expiredAvailable) {
    db.run(
      `UPDATE food_posts SET status = 'expired', updated_at = ? WHERE id = ?`,
      [nowIso, post.id]
    );
    affectedCount++;
    logs.push(`Available post #${post.id} ("${post.food_item}") marked as expired.`);

    // Notify donor that their post has expired
    db.run(
      `INSERT INTO notifications (user_id, title, message, type, link, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        post.donor_id,
        'Post Expired',
        `Your listing "${post.food_item}" has expired without being booked.`,
        'expiry',
        '/my-posts',
        nowIso
      ]
    );
  }

  // 2. Expire active booked posts past expires_at (uncollected)
  const expiredBookings = db.all(
    `SELECT b.id AS booking_id, b.receiver_id, b.receiver_name, p.id AS post_id, 
            p.food_item, p.donor_id, p.donor_name, p.expires_at 
     FROM bookings b
     JOIN food_posts p ON b.post_id = p.id
     WHERE b.status = 'active' AND p.expires_at <= ?`,
    [nowIso]
  );

  for (const b of expiredBookings) {
    db.run(`UPDATE food_posts SET status = 'expired', updated_at = ? WHERE id = ?`, [nowIso, b.post_id]);
    db.run(`UPDATE bookings SET status = 'expired_uncollected' WHERE id = ?`, [b.booking_id]);
    affectedCount++;
    logs.push(`Booked post #${b.post_id} ("${b.food_item}") expired uncollected.`);

    // Notify donor
    db.run(
      `INSERT INTO notifications (user_id, title, message, type, link, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        b.donor_id,
        'Booking Expired Uncollected',
        `Food item "${b.food_item}" expired before receiver ${b.receiver_name} could collect it.`,
        'expiry',
        '/my-posts',
        nowIso
      ]
    );

    // Notify receiver
    db.run(
      `INSERT INTO notifications (user_id, title, message, type, link, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        b.receiver_id,
        'Booking Expired',
        `Your booking for "${b.food_item}" expired before collection.`,
        'expiry',
        '/my-bookings',
        nowIso
      ]
    );
  }

  // 3. Reminder for active bookings older than 1 hour (uncollected)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const uncollectedBookings = db.all(
    `SELECT b.id, b.receiver_id, b.booked_at, p.food_item, p.pickup_address 
     FROM bookings b
     JOIN food_posts p ON b.post_id = p.id
     WHERE b.status = 'active' AND b.reminder_sent = 0 AND b.booked_at <= ? AND p.expires_at > ?`,
    [oneHourAgo, nowIso]
  );

  for (const item of uncollectedBookings) {
    db.run(`UPDATE bookings SET reminder_sent = 1 WHERE id = ?`, [item.id]);
    db.run(
      `INSERT INTO notifications (user_id, title, message, type, link, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        item.receiver_id,
        'Pickup Reminder',
        `Reminder: Please collect "${item.food_item}" from ${item.pickup_address} soon.`,
        'reminder',
        '/my-bookings',
        nowIso
      ]
    );
    logs.push(`Reminder sent to receiver #${item.receiver_id} for booking #${item.id}`);
  }

  // Record cron execution log
  db.run(
    `INSERT INTO cron_logs (job_type, details, items_affected, executed_at)
     VALUES (?, ?, ?, ?)`,
    [
      'expire_check',
      logs.length > 0 ? logs.join('; ') : 'No posts expired this cycle.',
      affectedCount,
      nowIso
    ]
  );

  return { affectedCount, logs, timestamp: nowIso };
}

/**
 * Stage 3: Permanent Cleanup Job (Runs every hour, or on-demand)
 * - Deletes posts that expired more than cleanupRetentionMinutes ago.
 * - PRESERVES posts with open reports! (Will not delete until admin resolves).
 * - Saves anonymous summary row into impact_summaries before deleting:
 *   (servings, donor_type, food_type, outcome, date).
 */
async function runCleanupCheck(customRetentionMinutes = null) {
  const db = await getDb();
  const retentionMins = customRetentionMinutes !== null ? customRetentionMinutes : cleanupRetentionMinutes;
  const cutoffTime = new Date(Date.now() - retentionMins * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString();
  let deletedCount = 0;
  let skippedCount = 0;
  const logs = [];

  // Find posts marked 'expired' (or 'collected') where updated_at/expires_at is older than cutoff
  const eligiblePosts = db.all(
    `SELECT p.* FROM food_posts p
     WHERE (p.status = 'expired' OR p.status = 'collected')
       AND p.updated_at <= ?`,
    [cutoffTime]
  );

  for (const post of eligiblePosts) {
    // Check if post has any OPEN reports
    const openReports = db.all(
      `SELECT id FROM reports WHERE post_id = ? AND status = 'open'`,
      [post.id]
    );

    if (openReports.length > 0) {
      skippedCount++;
      logs.push(`Skipped post #${post.id} (${post.food_item}) - Has ${openReports.length} pending open report(s).`);
      continue;
    }

    // Archive anonymous summary row before deletion to preserve impact stats
    const dateStr = (post.cooked_at || post.posted_at || nowIso).split('T')[0];
    db.run(
      `INSERT INTO impact_summaries (post_id, donor_id, donor_type, food_type, servings, outcome, event_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        post.id,
        post.donor_id,
        post.donor_type,
        post.food_type,
        post.servings,
        post.status, // 'collected' or 'expired'
        dateStr,
        nowIso
      ]
    );

    // Delete associated bookings
    db.run(`DELETE FROM bookings WHERE post_id = ?`, [post.id]);

    // Delete post
    db.run(`DELETE FROM food_posts WHERE id = ?`, [post.id]);
    deletedCount++;
    logs.push(`Permanently deleted post #${post.id} ("${post.food_item}"). Archived to impact summaries.`);
  }

  // Log cron run
  db.run(
    `INSERT INTO cron_logs (job_type, details, items_affected, executed_at)
     VALUES (?, ?, ?, ?)`,
    [
      'cleanup_check',
      `Retention: ${retentionMins}m. Deleted: ${deletedCount}, Preserved (open reports): ${skippedCount}. ${logs.join('; ')}`,
      deletedCount,
      nowIso
    ]
  );

  return { deletedCount, skippedCount, retentionMins, logs, timestamp: nowIso };
}

/**
 * Initialize Background Schedulers
 */
function initCronJobs() {
  console.log('🕒 Initializing PlateShare Background Cron Schedulers...');

  // Stage 2: Runs every minute ('* * * * *')
  cron.schedule('* * * * *', async () => {
    try {
      const res = await runExpiryCheck();
      if (res.affectedCount > 0) {
        console.log(`[CRON - Stage 2 Expiry] Processed ${res.affectedCount} items at ${res.timestamp}`);
      }
    } catch (err) {
      console.error('[CRON - Stage 2 Expiry Error]:', err);
    }
  });

  // Stage 3: Runs every hour ('0 * * * *')
  cron.schedule('0 * * * *', async () => {
    try {
      const res = await runCleanupCheck();
      console.log(`[CRON - Stage 3 Cleanup] Purged ${res.deletedCount} items at ${res.timestamp}`);
    } catch (err) {
      console.error('[CRON - Stage 3 Cleanup Error]:', err);
    }
  });

  console.log('✅ Cron Schedulers active: Stage 2 (every 1m), Stage 3 (every 1h).');
}

function setRetentionMinutes(mins) {
  cleanupRetentionMinutes = mins;
}

function getRetentionMinutes() {
  return cleanupRetentionMinutes;
}

module.exports = {
  runExpiryCheck,
  runCleanupCheck,
  initCronJobs,
  setRetentionMinutes,
  getRetentionMinutes
};
