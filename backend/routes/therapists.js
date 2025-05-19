// backend/routes/therapists.js
const express = require("express");
const router = express.Router();
const { getDbConnection } = require("../db");
const { v4: uuid } = require("uuid");
const bcrypt = require("bcrypt");
const { sendVerificationEmail } = require("../emailService");

// Fetch all therapists (with specialties array) - Includes admin_id for admin page filtering
router.get("/", async (req, res) => { // Added req to access query parameters
  try {
    const db = await getDbConnection();

    // Check for the unapprovedOnly query parameter
    const unapprovedOnly = req.query.unapprovedOnly === 'true';

    let sql = `
      SELECT t.therapist_id AS id,
             t.first_name || ' ' || t.last_name AS name,
             t.email, -- Included email
             t.admin_id, -- *** Include admin_id here for AdminPage filtering ***
             GROUP_CONCAT(ts.specialty) AS allSpecs
      FROM therapist_account t
      LEFT JOIN therapist_specialties ts
        ON t.therapist_id = ts.therapist_id
    `;

    if (unapprovedOnly) {
      sql += ` WHERE t.admin_id IS NULL `;
    }

    sql += ` GROUP BY t.therapist_id `;

    const raw = await db.all(sql);
    await db.close();

    const therapists = raw.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email, // Include email in the response object
      admin_id: r.admin_id, // *** Include admin_id in the response ***
      specialties: r.allSpecs ? r.allSpecs.split(",") : []
    }));
    res.json(therapists);
  } catch (err) {
    console.error("Fetch therapists error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Fetch one therapist (with specialties) - MODIFIED TO INCLUDE admin_id for frontend check
router.get("/:id", async (req, res) => {
  try {
    const db = await getDbConnection();
    const profile = await db.get(
      `SELECT therapist_id AS id,
              first_name || ' ' || last_name AS name,
              phone_number, age, address, zip_code,
             admin_id -- *** Added admin_id here for the frontend check ***
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

// Register new therapist - CORRECTED SQL INSERT
// Register new therapist - This section needs the correct SQL INSERT
router.post("/", async (req, res) => {
  try {
    const {
      first_name = null,
      last_name = null,
      phone_number = null,
      age = null,
      address = null,
      zip_code = null,
      email,
      password,
      specialties = []
    } = req.body;

    const db = await getDbConnection();
    const hashedPassword = await bcrypt.hash(password, 10);
    const verifyToken = uuid();

    const result = await db.run(
      `INSERT INTO therapist_account
         (first_name, last_name, phone_number, age, address, zip_code,
          email, password, email_verified, verify_token,
          admin_id, approval_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, // *** CORRECTED: 12 placeholders match 12 columns ***
      [
        first_name, last_name, phone_number, age, address, zip_code,
        email, hashedPassword,
        0,                     // Value for email_verified (0 for false)
        verifyToken,          // Value for verify_token
        null,                 // Value for admin_id (NULL initially)
        null                  // Value for approval_date (NULL initially)
      ] // *** CORRECTED: 12 values in the array match 12 placeholders ***
    );
    const therapistId = result.lastID;

    // ... rest of the function (specialties insert, email, response)
    for (const spec of specialties) {
      if (spec && spec.trim()) {
        await db.run(
          `INSERT INTO therapist_specialties (therapist_id, specialty)
           VALUES (?, ?)`,
          [therapistId, spec.trim()]
        );
      }
    }

    await db.close();

    sendVerificationEmail(email, verifyToken).catch(emailErr => {
        console.error("Failed to send verification email:", emailErr);
    });

    res.json({ message: "Therapist registered; verification email sent", therapistId });

  } catch (err) {
    console.error("Registration failed:", err);
    if (err.message && err.message.includes("SQLITE_CONSTRAINT")) {
        res.status(400).json({ error: "An account with this email already exists." });
    } else {
        res.status(500).json({ error: "Therapist registration failed due to a server error." });
    }
  }
});

// ... (rest of the therapists.js file)
// Update therapist profile & specialties (No changes needed here for this task)
router.put("/:id", async (req, res) => {
  try {
    const {
      first_name = null,
      last_name = null,
      phone_number = null,
      age = null,
      address = null,
      zip_code = null,
      specialties = []
    } = req.body;

    const db = await getDbConnection();
    await db.run(
      `UPDATE therapist_account
         SET first_name = ?, last_name = ?,
             phone_number = ?, age = ?,
             address = ?, zip_code = ?
       WHERE therapist_id = ?`,
      [first_name, last_name, phone_number, age, address, zip_code, req.params.id]
    );

    await db.run(`DELETE FROM therapist_specialties WHERE therapist_id = ?`, [req.params.id]);
    for (const spec of specialties) {
      if (spec && spec.trim()) { // Add check for empty/whitespace specialties
        await db.run(
          `INSERT INTO therapist_specialties (therapist_id, specialty)
           VALUES (?, ?)`,
          [req.params.id, spec.trim()] // Trim specialty string
        );
      }
    }

    await db.close();
    res.json({ message: "Therapist profile updated" });
  } catch (err) {
    console.error("Update failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// Add Approve Therapist Route - *** This was missing and caused the 404 error ***
router.put("/:id/approve", async (req, res) => {
    try {
        const { admin_id } = req.body; // Expecting the admin ID performing the approval
        const therapistId = req.params.id;

        if (!admin_id) {
            return res.status(400).json({ message: "Admin ID is required for approval." });
        }

        const db = await getDbConnection();

        // Check if the therapist exists and is not already approved
        const therapist = await db.get("SELECT therapist_id, admin_id FROM therapist_account WHERE therapist_id = ?", [therapistId]);
        if (!therapist) {
            await db.close();
            return res.status(404).json({ message: "Therapist not found." });
        }
        if (therapist.admin_id !== null) {
             await db.close();
             return res.status(400).json({ message: "Therapist is already approved." });
        }

        await db.run(
            `UPDATE therapist_account
             SET admin_id = ?, approval_date = CURRENT_TIMESTAMP
             WHERE therapist_id = ?`,
            [admin_id, therapistId]
        );
        await db.close();
        res.json({ message: `Therapist ${therapistId} approved by admin ${admin_id}.` });

    } catch (err) {
        console.error("Error approving therapist:", err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;