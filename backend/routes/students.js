const express = require("express");
const { getDbConnection } = require("../db");
const { v4: uuid }        = require("uuid");
const { sendVerificationEmail } = require("../emailService");
const router = express.Router();

// Create a student (with temporary placeholders & email-verification)
router.post("/", async (req, res) => {
  try {
    const db = await getDbConnection();
    const { email, password } = req.body;
    const verifyToken = uuid();

    // Temporary placeholders so name/phone/age NOT NULL errors won't fire
    const tempName  = "Temp Student";
    const tempPhone = "";
    const tempAge   = 0;

    const sql = `
      INSERT INTO student_account
        (name, phone_number, age, email, password, email_verified, verify_token)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `;
    const result = await db.run(sql, [
      tempName,
      tempPhone,
      tempAge,
      email,
      password,
      verifyToken
    ]);
    await db.close();

    await sendVerificationEmail(email, verifyToken);
    res.json({
      student_id: result.lastID,
      email,
      message: "Verification email sent"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a student’s profile post-verification
router.put("/:id", async (req, res) => {
  try {
    const db = await getDbConnection();
    const { name, phone_number, age, email } = req.body;
    await db.run(
      `UPDATE student_account
         SET name = ?, phone_number = ?, age = ?, email = ?
       WHERE student_id = ?`,
      [name, phone_number, age, email, req.params.id]
    );
    await db.close();
    res.json({ message: "Student updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;