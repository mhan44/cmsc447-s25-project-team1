// backend/routes/auth.js

require('dotenv').config();
const express = require('express');
const router  = express.Router();
const { getDbConnection } = require('../db');
const { v4: uuid } = require('uuid');
const { sendVerificationEmail } = require('../emailService');
const { sendPasswordResetEmail } = require('../emailService');
const bcrypt = require("bcrypt"); //hashing
const crypto = require('crypto');


// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { role, email, password } = req.body;
  try {
    const db = await getDbConnection();

    // pick the right table & include email_verified
    let sql;
    if (role === 'parent') {
      sql = 'SELECT parent_id AS id, password, email_verified FROM parent_account WHERE email = ?';
    } else if (role === 'therapist') {
      sql = 'SELECT therapist_id AS id, password, email_verified FROM therapist_account WHERE email = ?';
    } else {
      sql = 'SELECT student_id AS id, password, email_verified FROM student_account WHERE email = ?';
    }

    const row = await db.get(sql, [email]);
    if (!row || !(await bcrypt.compare(password, row.password))) {
      await db.close();
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (!row.email_verified) {
      await db.close();
      return res.status(403).json({ error: 'EMAIL_NOT_VERIFIED' });
    }

    // Check profile completeness
    let profileRow;
    if (role === 'parent') {
      profileRow = await db.get(
        `SELECT first_name, last_name, phone_number, age, address, zip_code
           FROM parent_account
          WHERE parent_id = ?`,
        [row.id]
      );
    } else if (role === 'therapist') {
      profileRow = await db.get(
        `SELECT first_name, last_name, phone_number, age, address, zip_code
           FROM therapist_account
          WHERE therapist_id = ?`,
        [row.id]
      );
    } else {
      profileRow = await db.get(
        `SELECT first_name, last_name, phone_number, age, address, zip_code
           FROM student_account
          WHERE student_id = ?`,
        [row.id]
      );
    }
    await db.close();

    const {
      first_name,
      last_name,
      phone_number,
      age,
      address,
      zip_code
    } = profileRow;
    const profileComplete = !!(
      first_name &&
      last_name &&
      phone_number &&
      age != null &&
      address &&
      zip_code
    );

    return res.json({
      message: 'Login successful',
      id: row.id,
      role,
      profileComplete
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/verify-email
router.get('/verify-email', async (req, res) => {
  const { email, token, role } = req.query;
  console.log('🔍 verify-email called:', { email, token, role });

  if (!email || !token) {
    return res.status(400).json({ error: 'Missing email or token' });
  }

  try {
    const db = await getDbConnection();

    // Helper to attempt verify on a given table
    const tryVerify = async (table) => {
      const row = await db.get(
        `SELECT email_verified FROM ${table} WHERE email = ? AND verify_token = ?`,
        [email, token]
      );
      if (!row) return false;
      await db.run(
        `UPDATE ${table} SET email_verified = 1, verify_token = NULL WHERE email = ?`,
        [email]
      );
      return true;
    };

    // Order: student, parent, therapist
    let verified =
      (await tryVerify('student_account')) ||
      (await tryVerify('parent_account')) ||
      (await tryVerify('therapist_account'));

    await db.close();

    if (verified) {
      console.log('✔️ verify-email: email verified for', email);
      return res.json({ success: true, message: 'Email successfully verified' });
    } else {
      console.log('❌ verify-email: invalid or expired token for', email);
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
  } catch (err) {
    console.error('🔴 verify-email error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/resend-verify
router.post('/resend-verify', async (req, res) => {
  const { email, role } = req.body;
  console.log('👉 resend-verify called for:', { email, role });

  try {
    const db = await getDbConnection();
    const newToken = uuid();

    // Build the right update SQL based on role
    let sql;
    if (role === 'parent') {
      sql = 'UPDATE parent_account SET verify_token = ?, email_verified = 0 WHERE email = ?';
    } else if (role === 'therapist') {
      sql = 'UPDATE therapist_account SET verify_token = ?, email_verified = 0 WHERE email = ?';
    } else {
      sql = 'UPDATE student_account SET verify_token = ?, email_verified = 0 WHERE email = ?';
    }

    const result = await db.run(sql, [newToken, email]);
    await db.close();

    if (result.changes === 0) {
      console.warn('⚠️ resend-verify: user not found:', email, role);
      return res.status(404).json({ error: 'User not found' });
    }

    // Now actually send the email
    try {
      await sendVerificationEmail(email, newToken);
      console.log('✔️ resend-verify: verification email sent to', email);
    } catch (sendErr) {
      console.error('❌ resend-verify: sendVerificationEmail error:', sendErr);
      return res.status(500).json({ error: 'Failed to send verification email' });
    }

    return res.json({ success: true, message: 'Verification email resent' });
  } catch (err) {
    console.error('❌ resend-verify: unexpected error:', err);
    return res.status(500).json({ error: err.message });
  }
});

//POST api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  const { email, role } = req.body;
  const table = `${role}_account`;

  try {
    const db = await getDbConnection();
    const user = await db.get(`SELECT * FROM ${table} WHERE email = ?`, [email]);
    if (!user) return res.status(404).json({ error: "Email not found." });

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); //1 hour

    await db.run(
      `UPDATE ${table} SET reset_token = ?, reset_token_expiry = ? WHERE email = ?`,
      [token, expiry, email]
    );
    await db.close();

    await sendPasswordResetEmail(email, token);
    res.json({ message: "Reset link sent to your email." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
});

//POST api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  const { role, token, newPassword } = req.body;
  const table = `${role}_account`;

  try {
    const db = await getDbConnection();
    const user = await db.get(`SELECT * FROM ${table} WHERE reset_token = ?`, [token]);

    if (!user || new Date(user.reset_token_expiry) < new Date()) {
      return res.status(400).json({ error: "Invalid or expired token." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.run(
      `UPDATE ${table} SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE email = ?`,
      [hashedPassword, user.email]
    );
    await db.close();

    res.json({ message: "Password has been reset." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
});

module.exports = router;