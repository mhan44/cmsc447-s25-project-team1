// backend/routes/therapists.js
const express = require("express");
const router = express.Router();
const { getDbConnection } = require("../db");
const { v4: uuid }        = require("uuid");
const bcrypt             = require("bcrypt");
const { sendVerificationEmail } = require("../emailService");

// Fetch all therapists (with specialties array)
router.get("/", async (_req, res) => {
  try {
    const db = await getDbConnection();
    const raw = await db.all(`
      SELECT t.therapist_id    AS id,
             t.first_name || ' ' || t.last_name AS name,
             GROUP_CONCAT(ts.specialty)       AS allSpecs
      FROM therapist_account t
      LEFT JOIN therapist_specialties ts
        ON t.therapist_id = ts.therapist_id
      GROUP BY t.therapist_id
    `);
    await db.close();

    const therapists = raw.map(r => ({
      id: r.id,
      name: r.name,
      specialties: r.allSpecs ? r.allSpecs.split(",") : []
    }));
    res.json(therapists);
  } catch (err) {
    console.error("Fetch therapists error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Fetch one therapist (with specialties)
router.get("/:id", async (req, res) => {
  try {
    const db = await getDbConnection();
    const profile = await db.get(
      `SELECT therapist_id AS id,
              first_name || ' ' || last_name AS name,
              phone_number, age, address, zip_code
       FROM therapist_account
       WHERE therapist_id = ?`,
      [req.params.id]
    );
    if (!profile) {
      await db.close();
      return res.status(404).json({ error: "Therapist not found" });
    }
    const specs = await db.all(
      `SELECT specialty FROM therapist_specialties WHERE therapist_id = ?`,
      [req.params.id]
    );
    await db.close();
    profile.specialties = specs.map(s => s.specialty);
    res.json(profile);
  } catch (err) {
    console.error("Fetch therapist error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Register new therapist (no admin/approval needed yet)
router.post("/", async (req, res) => {
  try {
    const {
      first_name = null,
      last_name  = null,
      phone_number = null,
      age         = null,
      address     = null,
      zip_code    = null,
      email,
      password,
      specialties = []
    } = req.body;

    const db = await getDbConnection();
    const hashedPassword = await bcrypt.hash(password, 10);
    const verifyToken    = uuid();

    const result = await db.run(
      `INSERT INTO therapist_account
         (first_name, last_name, phone_number, age, address, zip_code,
          email, password, email_verified, verify_token,
          admin_id, approval_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NULL, NULL)`,
      [
        first_name, last_name, phone_number, age, address, zip_code,
        email, hashedPassword, verifyToken
      ]
    );
    const therapistId = result.lastID;

    for (const spec of specialties) {
      await db.run(
        `INSERT INTO therapist_specialties (therapist_id, specialty)
         VALUES (?, ?)`,
        [therapistId, spec]
      );
    }

    await db.close();
    await sendVerificationEmail(email, verifyToken);
    res.json({ message: "Therapist registered; verification email sent", therapistId });
  } catch (err) {
    console.error("Registration failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update therapist profile & specialties
router.put("/:id", async (req, res) => {
  try {
    const {
      first_name = null,
      last_name  = null,
      phone_number = null,
      age         = null,
      address     = null,
      zip_code    = null,
      specialties = []
    } = req.body;

    const db = await getDbConnection();
    await db.run(
      `UPDATE therapist_account
         SET first_name   = ?, last_name    = ?,
             phone_number = ?, age          = ?,
             address      = ?, zip_code     = ?
       WHERE therapist_id = ?`,
      [first_name, last_name, phone_number, age, address, zip_code, req.params.id]
    );

    await db.run(`DELETE FROM therapist_specialties WHERE therapist_id = ?`, [req.params.id]);
    for (const spec of specialties) {
      await db.run(
        `INSERT INTO therapist_specialties (therapist_id, specialty)
         VALUES (?, ?)`,
        [req.params.id, spec]
      );
    }

    await db.close();
    res.json({ message: "Therapist profile updated" });
  } catch (err) {
    console.error("Update failed:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;