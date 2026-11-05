const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { runExpiryCheck, runCleanupCheck, setRetentionMinutes, getRetentionMinutes } = require('../cron');

/**
 * GET /api/admin/pending-users
 * List organizations & NGOs awaiting admin approval
 */
router.get('/pending-users', async (req, res) => {
  try {
    const db = await getDb();
    const pending = db.all(
      `SELECT id, name, email, phone, role, donor_type, is_org, verification_status, phone_verified, address, created_at 
       FROM users 
       WHERE verification_status = 'pending'
       ORDER BY id DESC`
    );
    res.json({ success: true, pending });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/users/:id/verify
 * Approve or Reject pending organization / NGO
 */
router.post('/users/:id/verify', async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.params.id;
    const { action } = req.body; // 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, error: "Action must be 'approve' or 'reject'" });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const nowIso = new Date().toISOString();

    db.run(
      `UPDATE users SET verification_status = ? WHERE id = ?`,
      [newStatus, userId]
    );

    // If donor was approved, also update existing posts donor_verified
    if (action === 'approve') {
      db.run(`UPDATE food_posts SET donor_verified = 1 WHERE donor_id = ?`, [userId]);
    }

    // Send notification to user
    db.run(
      `INSERT INTO notifications (user_id, title, message, type, link, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        action === 'approve' ? 'Organization Verified! 🎉' : 'Account Verification Update',
        action === 'approve' 
          ? 'Your organization has been officially verified! You now display the Verified Organisation badge on all listings.'
          : 'Your organization verification request was rejected. Please contact support.',
        'approval',
        '/',
        nowIso
      ]
    );

    res.json({
      success: true,
      message: `Organization account ${action === 'approve' ? 'approved' : 'rejected'} successfully.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/reports
 * Open reports requiring admin intervention
 */
router.get('/reports', async (req, res) => {
  try {
    const db = await getDb();
    const reports = db.all(
      `SELECT r.*, 
              p.food_item, p.servings, p.pickup_address, p.status AS post_status, p.report_count, p.is_flagged,
              u.name AS donor_name, u.email AS donor_email, u.phone AS donor_phone
       FROM reports r
       JOIN food_posts p ON r.post_id = p.id
       JOIN users u ON r.donor_id = u.id
       ORDER BY r.id DESC`
    );
    res.json({ success: true, reports });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/reports/:id/resolve
 * Resolve or dismiss a report
 */
router.post('/reports/:id/resolve', async (req, res) => {
  try {
    const db = await getDb();
    const reportId = req.params.id;
    const { action, admin_notes } = req.body; // 'dismiss' | 'take_down'

    const report = db.get('SELECT * FROM reports WHERE id = ?', [reportId]);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }

    const nowIso = new Date().toISOString();

    if (action === 'dismiss') {
      // Mark report as dismissed
      db.run(`UPDATE reports SET status = 'dismissed' WHERE id = ?`, [reportId]);

      // Check if any other open reports remain for this post
      const remaining = db.all(
        `SELECT id FROM reports WHERE post_id = ? AND status = 'open'`,
        [report.post_id]
      );

      if (remaining.length === 0) {
        // Reset flag if no more open reports
        db.run(`UPDATE food_posts SET is_flagged = 0, updated_at = ? WHERE id = ?`, [nowIso, report.post_id]);
      }

      return res.json({ success: true, message: 'Report dismissed. Post restored if no other open reports.' });
    } else if (action === 'take_down') {
      // Mark report resolved
      db.run(`UPDATE reports SET status = 'resolved' WHERE id = ?`, [reportId]);

      // Permanently remove the food post
      db.run(`UPDATE food_posts SET status = 'removed_by_admin', is_flagged = 1, updated_at = ? WHERE id = ?`, [
        nowIso,
        report.post_id
      ]);

      // Notify donor of violation
      db.run(
        `INSERT INTO notifications (user_id, title, message, type, link, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          report.donor_id,
          'Listing Removed by Admin',
          `Your post was removed following safety review: ${admin_notes || 'Failed safety & trust community standards.'}`,
          'report',
          '/',
          nowIso
        ]
      );

      return res.json({ success: true, message: 'Post taken down and donor warned.' });
    } else {
      return res.status(400).json({ success: false, error: 'Invalid action' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/system-stats
 * Comprehensive platform overview
 */
router.get('/system-stats', async (req, res) => {
  try {
    const db = await getDb();
    const nowIso = new Date().toISOString();

    const postStats = db.all(`SELECT status, COUNT(*) as count FROM food_posts GROUP BY status`);
    const userStats = db.all(`SELECT role, COUNT(*) as count FROM users GROUP BY role`);
    const pendingCount = db.get(`SELECT COUNT(*) as count FROM users WHERE verification_status = 'pending'`).count;
    const openReportsCount = db.get(`SELECT COUNT(*) as count FROM reports WHERE status = 'open'`).count;
    const impactCount = db.get(`SELECT COALESCE(SUM(servings), 0) as total_servings, COUNT(*) as total_records FROM impact_summaries WHERE outcome = 'collected'`);
    const liveAvailableCount = db.get(`SELECT COUNT(*) as count FROM food_posts WHERE status = 'available' AND expires_at > ?`, [nowIso]).count;

    res.json({
      success: true,
      stats: {
        posts_by_status: postStats,
        users_by_role: userStats,
        pending_verifications: pendingCount,
        open_reports: openReportsCount,
        total_servings_saved: impactCount.total_servings,
        live_available_posts: liveAvailableCount,
        cleanup_retention_minutes: getRetentionMinutes()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/cron/expire
 * Force-trigger Stage 2 expiry check
 */
router.post('/cron/expire', async (req, res) => {
  try {
    const result = await runExpiryCheck();
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/cron/cleanup
 * Force-trigger Stage 3 cleanup check (with optional custom test retention)
 */
router.post('/cron/cleanup', async (req, res) => {
  try {
    const retentionMinutes = req.body.retentionMinutes ? parseInt(req.body.retentionMinutes, 10) : null;
    const result = await runCleanupCheck(retentionMinutes);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/cron-logs
 * Fetch recent background job execution logs
 */
router.get('/cron-logs', async (req, res) => {
  try {
    const db = await getDb();
    const logs = db.all(`SELECT * FROM cron_logs ORDER BY id DESC LIMIT 50`);
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
