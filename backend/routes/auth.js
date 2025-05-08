// backend/routes/auth.js

require('dotenv').config();
const express = require('express');
const router  = express.Router();
const { getDbConnection } = require('../db');
const { v4: uuid } = require('uuid');
const { sendVerificationEmail } = require('../emailService');

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
    await db.close();

    // invalid credentials
    if (!row || row.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // block if not verified
    if (!row.email_verified) {
      return res.status(403).json({ error: 'EMAIL_NOT_VERIFIED' });
    }

    // success
    return res.json({ message: 'Login successful', id: row.id, role });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/verify-email
router.get('/verify-email', async (req, res) => {
  const { email, token } = req.query;
  try {
    const db = await getDbConnection();

    // 1) Try student
    let row = await db.get(
      `SELECT email_verified FROM student_account WHERE email = ? AND verify_token = ?`,
      [email, token]
    );
    if (row) {
      await db.run(
        `UPDATE student_account SET email_verified = 1, verify_token = NULL WHERE email = ?`,
        [email]
      );
      await db.close();
      return res.json({ success: true, message: 'Email verified' });
    }

    // 2) Try parent
    row = await db.get(
      `SELECT email_verified FROM parent_account WHERE email = ? AND verify_token = ?`,
      [email, token]
    );
    if (row) {
      await db.run(
        `UPDATE parent_account SET email_verified = 1, verify_token = NULL WHERE email = ?`,
        [email]
      );
      await db.close();
      return res.json({ success: true, message: 'Email verified' });
    }

    // 3) Try therapist
    row = await db.get(
      `SELECT email_verified FROM therapist_account WHERE email = ? AND verify_token = ?`,
      [email, token]
    );
    if (row) {
      await db.run(
        `UPDATE therapist_account SET email_verified = 1, verify_token = NULL WHERE email = ?`,
        [email]
      );
      await db.close();
      return res.json({ success: true, message: 'Email verified' });
    }

    // No match
    await db.close();
    return res.status(400).json({ error: 'Invalid or expired token' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/resend-verify
router.post('/resend-verify', async (req, res) => {
  const { email, role } = req.body;
  try {
    const db = await getDbConnection();
    const newToken = uuid();

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
      return res.status(404).json({ error: 'User not found' });
    }

    await sendVerificationEmail(email, newToken);
    return res.json({ success: true, message: 'Verification email resent' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;