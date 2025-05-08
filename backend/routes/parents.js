const express = require("express");
const { getDbConnection } = require("../db");
const { v4: uuid }        = require("uuid");
const { sendVerificationEmail } = require("../emailService");
const router = express.Router();

// Create a parent (with temporary placeholders & email-verification)
router.post("/", async (req, res) => {
  try {
    const db = await getDbConnection();
    const { email, password } = req.body;
    const verifyToken = uuid();

    const tempName  = "Temp Parent";
    const tempPhone = "";
    const tempAge   = 0;

    const sql = `
      INSERT INTO parent_account
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
      parent_id: result.lastID,
      email,
      message: "Verification email sent"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a parent’s profile post-verification
router.put("/:id", async (req, res) => {
  try {
    const db = await getDbConnection();
    const { name, phone_number, age, email, student_id } = req.body;
    await db.run(
      `UPDATE parent_account
         SET name = ?, phone_number = ?, age = ?, email = ?, student_id = ?
       WHERE parent_id = ?`,
      [name, phone_number, age, email, student_id, req.params.id]
    );
    await db.close();
    res.json({ message: "Parent updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;