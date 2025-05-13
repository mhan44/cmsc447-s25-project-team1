const express = require("express");
const { getDbConnection } = require("../db");
const { v4: uuid }        = require("uuid");
const { sendVerificationEmail } = require("../emailService");
const router = express.Router();

// Create a parent
router.post("/", async (req, res) => {
  console.log("Register request received:", req.body);
  try {
    const db = await getDbConnection();
    const { email, password } = req.body;
    const verifyToken = uuid();

    const tempFirst = "Temp", tempLast = "Parent";
    const tempPhone = "", tempAge = 0, tempAddr = "", tempZip = "";

    await db.run(
      `INSERT INTO parent_account
         (first_name, last_name, phone_number, age, address, zip_code, email, password, email_verified, verify_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [tempFirst, tempLast, tempPhone, tempAge, tempAddr, tempZip, email, password, verifyToken]
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

// Update a parent’s profile
router.put("/:id", async (req, res) => {
  try {
    const { first_name, last_name, phone_number, age, address, zip_code, student_id } = req.body;
    const db = await getDbConnection();
    await db.run(
      `UPDATE parent_account
         SET first_name = ?, last_name = ?, phone_number = ?, age = ?, address = ?, zip_code = ?, student_id = ?
       WHERE parent_id = ?`,
      [first_name, last_name, phone_number, age, address, zip_code, student_id, req.params.id]
    );
    await db.close();
    res.json({ message: "Parent updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;