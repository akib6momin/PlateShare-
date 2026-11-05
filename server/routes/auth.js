const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// List all users for demo role switching
router.get('/users', async (req, res) => {
  try {
    const db = await getDb();
    const users = db.all(
      `SELECT id, name, email, phone, role, donor_type, is_org, verification_status, phone_verified, rating_avg, rating_count, address, created_at 
       FROM users ORDER BY id ASC`
    );
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Register new user
router.post('/register', async (req, res) => {
  try {
    const db = await getDb();
    const { name, email, phone, password, role, donor_type, address } = req.body;

    if (!name || !email || !phone || !password || !role) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const existing = db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }

    // Determine org status and verification requirements
    // Hostels, Restaurants, Caterers, Canteens, and NGOs are organizations
    const isOrg = ['Hostel / Mess', 'Restaurant / Cafe', 'Caterer / Event host', 'Company canteen'].includes(donor_type) ||
                  (role === 'receiver' && req.body.is_ngo === true);

    // Prompt requirement:
    // "Organisation donors and NGOs are 'pending' until an admin verifies them.
    // Individual donors and individual receivers can start after phone OTP verification, but get a 'Verified organisation' badge only after approval."
    const verificationStatus = isOrg ? 'pending' : 'approved';
    const otpCode = '123456'; // Demo fixed OTP code for simple verification
    const nowIso = new Date().toISOString();

    const result = db.run(
      `INSERT INTO users (name, email, phone, password, role, donor_type, is_org, verification_status, phone_verified, otp_code, address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      [
        name,
        email,
        phone,
        password,
        role,
        role === 'donor' ? donor_type : null,
        isOrg ? 1 : 0,
        verificationStatus,
        otpCode,
        address || 'Address provided at booking',
        nowIso
      ]
    );

    const newUser = db.get(
      `SELECT id, name, email, phone, role, donor_type, is_org, verification_status, phone_verified, rating_avg, rating_count, address, created_at 
       FROM users WHERE id = ?`,
      [result.lastInsertRowid]
    );

    res.status(201).json({
      success: true,
      user: newUser,
      message: isOrg 
        ? 'Account registered! Your organisation profile is pending admin verification.' 
        : 'Account registered successfully.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const db = await getDb();
    const { identifier, password } = req.body; // email or phone

    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: 'Identifier and password required' });
    }

    const user = db.get(
      `SELECT id, name, email, phone, password, role, donor_type, is_org, verification_status, phone_verified, rating_avg, rating_count, address, created_at 
       FROM users WHERE (email = ? OR phone = ?)`,
      [identifier, identifier]
    );

    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, error: 'Invalid email/phone or password' });
    }

    const { password: _, ...userWithoutPass } = user;
    res.json({ success: true, user: userWithoutPass });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Phone OTP verification simulation
router.post('/verify-otp', async (req, res) => {
  try {
    const db = await getDb();
    const { userId, otp } = req.body;

    const user = db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (otp === '123456' || otp === user.otp_code) {
      db.run('UPDATE users SET phone_verified = 1 WHERE id = ?', [userId]);
      const updated = db.get(
        `SELECT id, name, email, phone, role, donor_type, is_org, verification_status, phone_verified, rating_avg, rating_count, address, created_at 
         FROM users WHERE id = ?`,
        [userId]
      );
      return res.json({ success: true, user: updated, message: 'Phone verified successfully!' });
    } else {
      return res.status(400).json({ success: false, error: 'Incorrect OTP. Try 123456.' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
