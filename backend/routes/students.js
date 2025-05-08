const express = require("express");
const { getDbConnection } = require("../db");
const { v4: uuid }        = require("uuid");
const { sendVerificationEmail } = require("../emailService");
const router = express.Router();

// Create a student
router.post("/", async (req, res) => {
  try {
    const db = await getDbConnection();
    const { email, password } = req.body;
    const verifyToken = uuid();

    // Temp placeholders
    const tempFirst = "Temp", tempLast = "Student";
    const tempPhone = "", tempAge = 0, tempAddr = "", tempZip = "";

    await db.run(
      `INSERT INTO student_account
         (first_name, last_name, phone_number, age, address, zip_code, email, password, email_verified, verify_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [tempFirst, tempLast, tempPhone, tempAge, tempAddr, tempZip, email, password, verifyToken]
    );
    await db.close();

    await sendVerificationEmail(email, verifyToken);
    res.json({ message: "Verification email sent", email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a student’s profile post-verification
router.put("/:id", async (req, res) => {
  try {
    const { first_name, last_name, phone_number, age, address, zip_code } = req.body;
    const db = await getDbConnection();
    await db.run(
      `UPDATE student_account
         SET first_name = ?, last_name = ?, phone_number = ?, age = ?, address = ?, zip_code = ?
       WHERE student_id = ?`,
      [first_name, last_name, phone_number, age, address, zip_code, req.params.id]
    );
    await db.close();
    res.json({ message: "Student updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;