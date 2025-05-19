// backend/routes/students.js

const express = require("express");
const { getDbConnection } = require("../db");
const { v4: uuid }        = require("uuid");
const { sendVerificationEmail } = require("../emailService");
const router = express.Router();
const bcrypt = require("bcrypt"); // password hashing

// Create a student (registration) - Existing route
router.post("/", async (req, res) => {
  console.log("Register request received:", req.body);
  try {
    const db = await getDbConnection();
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const verifyToken = uuid();

    // Temp placeholders
    const tempFirst = "Temp",
          tempLast  = "Student",
          tempPhone = "",
          tempAge   = 0,
          tempAddr  = "",
          tempZip   = "";

    await db.run(
      `INSERT INTO student_account
         (first_name, last_name, phone_number, age, address, zip_code, email, password, email_verified, verify_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [tempFirst, tempLast, tempPhone, tempAge, tempAddr, tempZip, email, hashedPassword, verifyToken]
    );
    await db.close();

    await sendVerificationEmail(email, verifyToken);
    res.json({ message: "Verification email sent", email });
  } catch (err) {
    console.error("Registration failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update a student’s profile post-verification - Existing route
router.put("/:id", async (req, res) => {
  try {
    const { first_name, last_name, phone_number, age, address, zip_code } = req.body;
    const db = await getDbConnection();
    await db.run(
      `UPDATE student_account
         SET first_name   = ?,
             last_name    = ?,
             phone_number = ?,
             age          = ?,
             address      = ?,
             zip_code     = ?
       WHERE student_id = ?`,
      [first_name, last_name, phone_number, age, address, zip_code, req.params.id]
    );
    await db.close();
    res.json({ message: "Student updated successfully" });
  } catch (err) {
    console.error("Update failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- ADDED GET ALL STUDENTS ROUTE ---
// This route is needed by the AdminPage to list all students
router.get("/", async (_req, res) => {
  try {
    const db = await getDbConnection();
    const students = await db.all(`
      SELECT student_id,
             first_name || ' ' || last_name AS name, -- Concatenate first and last name
             email,
             phone_number, age, address, zip_code
      FROM student_account
    `);
    await db.close();
    res.json(students); // Send the list of students as JSON
  } catch (err) {
    console.error("Fetch students error:", err.message);
    res.status(500).json({ error: err.message });
  }
});
// --- END ADDED GET ALL STUDENTS ROUTE ---


module.exports = router;