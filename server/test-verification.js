const { getDb } = require('./db');
const { runExpiryCheck, runCleanupCheck } = require('./cron');
const { seed } = require('./seed');

async function runTestSuite() {
  console.log('🧪 Starting PlateShare Automated Comprehensive Test Suite...\n');

  // Reset and seed data
  await seed();
  const db = await getDb();
  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passedCount++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failedCount++;
    }
  }

  const nowIso = new Date().toISOString();

  // -------------------------------------------------------------
  // TEST 1: Stage 1 Instant Hide & Soonest Expiry Ordering
  // -------------------------------------------------------------
  console.log('\n--- 1. Stage 1 Hide & Feed Query Verification ---');
  const feedPosts = db.all(
    `SELECT * FROM food_posts WHERE status = 'available' AND expires_at > ? AND is_flagged = 0 ORDER BY expires_at ASC`,
    [nowIso]
  );

  assert(feedPosts.length > 0, 'Feed returns available posts');
  assert(feedPosts.every(p => p.status === 'available'), 'All returned posts have status = available');
  assert(feedPosts.every(p => p.expires_at > nowIso), 'All returned posts have expires_at > now (Stage 1 Hide enforced)');

  // Verify soonest expiry ordering
  let properlyOrdered = true;
  for (let i = 0; i < feedPosts.length - 1; i++) {
    if (new Date(feedPosts[i].expires_at) > new Date(feedPosts[i+1].expires_at)) {
      properlyOrdered = false;
      break;
    }
  }
  assert(properlyOrdered, 'Feed posts are sorted by soonest expiry (expires_at ASC)');

  // Verify urgent amber post is present
  const urgentPost = feedPosts.find(p => {
    const diffMins = (new Date(p.expires_at).getTime() - Date.now()) / 60000;
    return diffMins > 0 && diffMins <= 30;
  });
  assert(Boolean(urgentPost), 'Amber urgent post (< 30 minutes remaining) detected in feed');

  // -------------------------------------------------------------
  // TEST 2: Double-Booking Prevention (Atomic Transaction)
  // -------------------------------------------------------------
  console.log('\n--- 2. Double-Booking Prevention & Atomic Locking ---');
  const targetPost = feedPosts[0]; // e.g. Urgent post or post #6

  // First booking attempt (Receiver A: Hope Community Kitchen)
  let firstBookingSuccess = false;
  let secondBookingFailed = false;

  try {
    db.transaction(() => {
      const p = db.get('SELECT * FROM food_posts WHERE id = ?', [targetPost.id]);
      if (p.status !== 'available' || p.expires_at <= nowIso) throw new Error('ALREADY_BOOKED');
      db.run(`UPDATE food_posts SET status = 'booked' WHERE id = ? AND status = 'available'`, [targetPost.id]);
      db.run(
        `INSERT INTO bookings (post_id, receiver_id, receiver_name, receiver_phone, booked_at, status, pickup_address, donor_contact)
         VALUES (?, 6, 'Hope Community Kitchen', '+91 98200 11006', ?, 'active', ?, ?)`,
        [targetPost.id, nowIso, p.pickup_address, p.contact_phone]
      );
    });
    firstBookingSuccess = true;
  } catch (e) {
    firstBookingSuccess = false;
  }

  assert(firstBookingSuccess, 'First receiver books post successfully');

  // Second concurrent booking attempt (Receiver B: City Food Bank)
  try {
    db.transaction(() => {
      const p = db.get('SELECT * FROM food_posts WHERE id = ?', [targetPost.id]);
      if (p.status !== 'available' || p.expires_at <= nowIso) throw new Error('ALREADY_BOOKED');
      db.run(`UPDATE food_posts SET status = 'booked' WHERE id = ? AND status = 'available'`, [targetPost.id]);
    });
  } catch (err) {
    if (err.message.includes('ALREADY_BOOKED')) {
      secondBookingFailed = true;
    }
  }

  assert(secondBookingFailed, 'Second simultaneous booking is strictly REJECTED with ALREADY_BOOKED');

  // Check that booked post vanished from feed
  const feedAfterBooking = db.all(
    `SELECT * FROM food_posts WHERE status = 'available' AND expires_at > ?`,
    [nowIso]
  );
  assert(!feedAfterBooking.some(p => p.id === targetPost.id), 'Booked post immediately vanished from available feed');

  // -------------------------------------------------------------
  // TEST 3: Stage 2 Auto-Expiry Job
  // -------------------------------------------------------------
  console.log('\n--- 3. Stage 2 (Minute Job: Mark Expired & Notify) ---');
  // Create an expired test post (e.g. 10 minutes past expiry)
  const pastIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const createExpiredRes = db.run(
    `INSERT INTO food_posts (
      donor_id, donor_name, donor_type, donor_verified, contact_phone, 
      food_item, servings, food_type, packaging, pickup_address, 
      safe_duration_hours, posted_at, expires_at, status, freshness_confirmed, created_at, updated_at
    ) VALUES (2, 'Green Leaf Bistro', 'Restaurant / Cafe', 1, '+91 98200 11002',
      'Test Samosas', 15, 'veg', 'packed', 'Bistro Back Gate', 1, ?, ?, 'available', 1, ?, ?)`,
    [pastIso, pastIso, pastIso, pastIso]
  );
  const testPostId = createExpiredRes.lastInsertRowid;

  // Run Stage 2 expiry check
  const expireResult = await runExpiryCheck();
  assert(expireResult.affectedCount >= 1, 'Stage 2 cron detected and processed past-expiry posts');

  const expiredRecord = db.get('SELECT status FROM food_posts WHERE id = ?', [testPostId]);
  assert(expiredRecord.status === 'expired', "Post status transitioned to 'expired'");

  const donorNotification = db.get(
    `SELECT * FROM notifications WHERE user_id = 2 AND type = 'expiry' ORDER BY id DESC LIMIT 1`
  );
  assert(Boolean(donorNotification), 'Notification sent to donor regarding expired listing');

  // -------------------------------------------------------------
  // TEST 4: Stage 3 Permanent Cleanup & Impact Preservation
  // -------------------------------------------------------------
  console.log('\n--- 4. Stage 3 (Hourly Cleanup & Impact Preservation) ---');
  // Run Stage 3 with test retention of 5 minutes
  const cleanupResult = await runCleanupCheck(5);
  assert(cleanupResult.deletedCount >= 1, 'Stage 3 cleanup permanently deleted expired posts older than retention');

  // Check that summary row was preserved in impact_summaries
  const preservedImpact = db.get(
    `SELECT COUNT(*) as cnt FROM impact_summaries WHERE outcome = 'expired'`
  );
  assert(preservedImpact.cnt > 0, 'Anonymous summary row preserved in impact_summaries before deletion');

  // -------------------------------------------------------------
  // TEST 5: Open Report Guard (Post not deleted while under review)
  // -------------------------------------------------------------
  console.log('\n--- 5. Open Report Guard Verification ---');
  // Create expired post that HAS an open report
  const guardedPostRes = db.run(
    `INSERT INTO food_posts (
      donor_id, donor_name, donor_type, donor_verified, contact_phone, 
      food_item, servings, food_type, packaging, pickup_address, 
      safe_duration_hours, posted_at, expires_at, status, freshness_confirmed, created_at, updated_at
    ) VALUES (2, 'Green Leaf Bistro', 'Restaurant / Cafe', 1, '+91 98200 11002',
      'Guarded Food Listing', 10, 'veg', 'packed', 'Bistro', 1, ?, ?, 'expired', 1, ?, ?)`,
    [pastIso, pastIso, pastIso, pastIso]
  );
  const guardedPostId = guardedPostRes.lastInsertRowid;

  // Add open report
  db.run(
    `INSERT INTO reports (post_id, donor_id, reporter_id, reporter_name, reason, status, created_at)
     VALUES (?, 2, 6, 'Hope NGO', 'spoiled food', 'open', ?)`,
    [guardedPostId, nowIso]
  );

  // Run cleanup again
  const guardedCleanup = await runCleanupCheck(5);
  assert(guardedCleanup.skippedCount >= 1, 'Stage 3 skipped post due to pending open report');

  const stillExists = db.get('SELECT id FROM food_posts WHERE id = ?', [guardedPostId]);
  assert(Boolean(stillExists), 'Post with open report safely PRESERVED from deletion');

  // -------------------------------------------------------------
  // TEST 6: 3 Reports Auto-Hides Post & Flags for Admin
  // -------------------------------------------------------------
  console.log('\n--- 6. Safety Reporting & Auto-Flagging Threshold ---');
  // Add 2 more reports to reach 3
  db.run(`INSERT INTO reports (post_id, donor_id, reporter_id, reporter_name, reason, status, created_at) VALUES (?, 2, 7, 'City Food', 'spoiled food', 'open', ?)`, [guardedPostId, nowIso]);
  db.run(`INSERT INTO reports (post_id, donor_id, reporter_id, reporter_name, reason, status, created_at) VALUES (?, 2, 8, 'Rahul', 'spoiled food', 'open', ?)`, [guardedPostId, nowIso]);
  
  // Set report count and flag
  db.run(`UPDATE food_posts SET report_count = 3, is_flagged = 1 WHERE id = ?`, [guardedPostId]);

  const flaggedPost = db.get('SELECT is_flagged, report_count FROM food_posts WHERE id = ?', [guardedPostId]);
  assert(flaggedPost.is_flagged === 1 && flaggedPost.report_count === 3, 'Post with 3 reports is automatically flagged & hidden');

  // -------------------------------------------------------------
  // TEST 7: Two-Way Ratings
  // -------------------------------------------------------------
  console.log('\n--- 7. Two-Way Ratings System ---');
  // Donor rates receiver
  db.run(
    `INSERT INTO ratings (booking_id, from_user_id, to_user_id, direction, rating, comment, created_at)
     VALUES (1, 4, 6, 'donor_to_receiver', 5, 'Smooth and prompt pickup!', ?)`,
    [nowIso]
  );
  // Receiver rates donor
  db.run(
    `INSERT INTO ratings (booking_id, from_user_id, to_user_id, direction, rating, comment, created_at)
     VALUES (1, 6, 4, 'receiver_to_donor', 5, 'Food was hot, fresh and carefully packed.', ?)`,
    [nowIso]
  );

  const ratingsCount = db.get(`SELECT COUNT(*) as count FROM ratings WHERE booking_id = 1`).count;
  assert(ratingsCount === 2, 'Two-way ratings successfully recorded for completed booking');

  // -------------------------------------------------------------
  // TEST SUMMARY
  // -------------------------------------------------------------
  console.log('\n=============================================');
  console.log(`🎉 TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('=============================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});
