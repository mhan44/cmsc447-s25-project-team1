// backend/routes/parents.js

const express = require("express");
const { getDbConnection } = require("../db");
const { v4: uuid }        = require("uuid");
const { sendVerificationEmail } = require("../emailService");
const router = express.Router();
const bcrypt = require("bcrypt"); // password hashing

// Create a parent (registration) - Existing route
router.post("/", async (req, res) => {
  console.log("Register request received:", req.body);
  try {
    const db = await getDbConnection();
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const verifyToken = uuid();

    // Temp placeholders
    const tempFirst = "Temp",
          tempLast  = "Parent",
          tempPhone = "",
          tempAge   = 0,
          tempAddr  = "",
          tempZip   = "";

    await db.run(
      `INSERT INTO parent_account
         (first_name, last_name, phone_number, age, address, zip_code,
          email, password, email_verified, verify_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [tempFirst, tempLast, tempPhone, tempAge, tempAddr, tempZip, email, hashedPassword, verifyToken]
    );
    await db.close();

    await sendVerificationEmail(email, verifyToken);
    res.json({ message: "Verification email sent", email });
  } catch (err) {
    console.error("Registration failed:", err.message);
    console.error("Full error object:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update a parent’s profile - Existing route
router.put("/:id", async (req, res) => {
  try {
    const { first_name, last_name, phone_number, age, address, zip_code } = req.body;
    const db = await getDbConnection();
    await db.run(
      `UPDATE parent_account
         SET first_name   = ?,
             last_name    = ?,
             phone_number = ?,
             age          = ?,
             address      = ?,
             zip_code     = ?
       WHERE parent_id = ?`,
      [first_name, last_name, phone_number, age, address, zip_code, req.params.id]
    );
    await db.close();
    res.json({ message: "Parent updated successfully" });
  } catch (err) {
    console.error("Update failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- ADDED GET ALL PARENTS ROUTE ---
// This route now joins with parent_student to include the linked student_id
router.get("/", async (_req, res) => {
  try {
    const db = await getDbConnection();
    const parents = await db.all(`
      SELECT pa.parent_id,
             pa.first_name || ' ' || pa.last_name AS name, -- Concatenate first and last name
             pa.email,
             ps.student_id -- <<< Select student_id from the parent_student table
      FROM parent_account pa -- Give parent_account a short alias 'pa'
      LEFT JOIN parent_student ps ON pa.parent_id = ps.parent_id -- LEFT JOIN the join table
      GROUP BY pa.parent_id -- Group by parent to avoid duplicate rows if a parent had multiple students (though the UI implies one primary link)
    `);
    await db.close();
    res.json(parents); // Send the list of parents as JSON
  } catch (err) {
    console.error("Fetch parents error:", err.message);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;