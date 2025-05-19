// backend/routes/therapists.js
const express = require("express");
const router = express.Router();
const { getDbConnection } = require("../db");
const { v4: uuid }        = require("uuid");
const bcrypt             = require("bcrypt");
const { sendVerificationEmail } = require("../emailService");

// Fetch all therapists (with specialties array) - MODIFIED TO HANDLE unapprovedOnly
router.get("/", async (req, res) => { // Added req to access query parameters
  try {
    const db = await getDbConnection();

    // Check for the unapprovedOnly query parameter
    const unapprovedOnly = req.query.unapprovedOnly === 'true';

    let sql = `
      SELECT t.therapist_id    AS id,
             t.first_name || ' ' || t.last_name AS name,
             t.email, -- Added email back as it's used in AdminPage for unapproved list
             GROUP_CONCAT(ts.specialty)       AS allSpecs
      FROM therapist_account t
      LEFT JOIN therapist_specialties ts
        ON t.therapist_id = ts.therapist_id
    `;

    // If unapprovedOnly is true, add the WHERE clause
    if (unapprovedOnly) {
      sql += ` WHERE t.admin_id IS NULL `;
    }

    sql += ` GROUP BY t.therapist_id `; // Add the GROUP BY clause

    const raw = await db.all(sql); // Use the constructed SQL query
    await db.close();

    const therapists = raw.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email, // Include email in the response object
      specialties: r.allSpecs ? r.allSpecs.split(",") : []
    }));
    res.json(therapists);
  } catch (err) {
    console.error("Fetch therapists error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Fetch one therapist (with specialties) - REMAINS THE SAME
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

// Register new therapist - REMAINS THE SAME
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
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NULL, NULL)`, // admin_id and approval_date are NULL initially
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

// Register new therapist - CORRECTED SQL INSERT
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
      specialties = [] // Specialties are handled separately below the main insert
    } = req.body; // These fields are expected from the frontend request body

    const db = await getDbConnection();
    const hashedPassword = await bcrypt.hash(password, 10);
    const verifyToken = uuid(); // Generate a token for email verification

    // *** THIS IS THE CRUCIAL INSERT STATEMENT ***
    const result = await db.run(
      `INSERT INTO therapist_account
         (first_name, last_name, phone_number, age, address, zip_code,
          email, password, email_verified, verify_token,
          admin_id, approval_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, // <--- Must have EXACTLY 12 '?' placeholders here
      [
        first_name, // Corresponds to 1st ?
        last_name,  // Corresponds to 2nd ?
        phone_number, // Corresponds to 3rd ?
        age,        // Corresponds to 4th ?
        address,    // Corresponds to 5th ?
        zip_code,   // Corresponds to 6th ?
        email,      // Corresponds to 7th ?
        hashedPassword, // Corresponds to 8th ?
        0,                     // Corresponds to 9th ? (literal 0)
        verifyToken,          // Corresponds to 10th ? (generated token)
        null,                 // Corresponds to 11th ? (literal null)
        null                  // Corresponds to 12th ? (literal null)
      ] // <--- Must have EXACTLY 12 items in this array
    );
    const therapistId = result.lastID; // Get the auto-generated ID

    // Insert specialties into therapist_specialties table
    for (const spec of specialties) {
      if (spec && spec.trim()) { // Check if specialty string is not empty or just whitespace
        await db.run(
          `INSERT INTO therapist_specialties (therapist_id, specialty)
           VALUES (?, ?)`, // 2 placeholders
          [therapistId, spec.trim()] // 2 values
        );
      }
    }

    await db.close(); // Close database connection

    // Attempt to send verification email asynchronously
    // Using .catch to prevent email sending failure from blocking the registration success response
    sendVerificationEmail(email, verifyToken).catch(emailErr => {
        console.error("Failed to send verification email:", emailErr);
        // You might want more sophisticated error handling here, but for now, just log it.
    });

    // Send successful registration response
    res.json({ message: "Therapist registered; verification email sent", therapistId });
  } catch (err) {
    console.error("Registration failed:", err);
    // Check if the error is a unique constraint violation (e.g., email already exists)
    if (err.message && err.message.includes("SQLITE_CONSTRAINT")) {
        res.status(400).json({ error: "An account with this email already exists." });
    } else {
        // Generic error for other database or server issues
        res.status(500).json({ error: "Therapist registration failed due to a server error." });
    }
  }
});

// Update therapist profile & specialties - REMAINS THE SAME
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


// Add Approve Therapist Route - Based on AdminPage calling PUT /api/therapists/:therapistId/approve
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