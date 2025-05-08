const express = require("express");
const { getDbConnection } = require("../db");
const { v4: uuid }        = require("uuid");
const { sendVerificationEmail } = require("../emailService");
const router = express.Router();

// Create a therapist (with temporary placeholders & email-verification)
router.post("/", async (req, res) => {
  try {
    const db = await getDbConnection();
    const { email, password, admin_id, approval_date } = req.body;
    const verifyToken = uuid();

    const tempName  = "Temp Therapist";
    const tempPhone = "";
    const tempAge   = 0;

    const sql = `
      INSERT INTO therapist_account
        (name, phone_number, age, email, password, email_verified, verify_token, admin_id, approval_date)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)
    `;
    const result = await db.run(sql, [
      tempName,
      tempPhone,
      tempAge,
      email,
      password,
      verifyToken,
      admin_id,
      approval_date
    ]);
    await db.close();

    await sendVerificationEmail(email, verifyToken);
    res.json({
      therapist_id: result.lastID,
      email,
      admin_id,
      approval_date,
      message: "Verification email sent"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a therapist’s profile post-verification
router.put("/:id", async (req, res) => {
  try {
    const db = await getDbConnection();
    const { name, phone_number, age, email, admin_id, approval_date } = req.body;
    await db.run(
      `UPDATE therapist_account
         SET name = ?, phone_number = ?, age = ?, email = ?, admin_id = ?, approval_date = ?
       WHERE therapist_id = ?`,
      [name, phone_number, age, email, admin_id, approval_date, req.params.id]
    );
    await db.close();
    res.json({ message: "Therapist updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;