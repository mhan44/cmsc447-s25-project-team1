// backend/routes/parentStudents.js
const express = require("express");
const { getDbConnection } = require("../db");
const router = express.Router();

// List all children for a given parent
// GET /api/parents/:id/students
router.get("/:id/students", async (req, res) => {
  try {
    const db = await getDbConnection();
    const rows = await db.all(
      `SELECT s.student_id   AS id,
              s.first_name   || ' ' || s.last_name AS name,
              s.email
       FROM parent_student ps
       JOIN student_account s ON ps.student_id = s.student_id
       WHERE ps.parent_id = ?`,
      [req.params.id]
    );
    await db.close();
    res.json(rows);
  } catch (err) {
    console.error("Failed to fetch children:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Link an existing student to a parent by email
// POST /api/parents/:id/students  { email: string }
router.post("/:id/students", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Student email is required" });
  }
  try {
    const db = await getDbConnection();
    // find student
    const student = await db.get(
      `SELECT student_id AS id, first_name, last_name, email
       FROM student_account
       WHERE email = ?`,
      [email]
    );
    if (!student) {
      await db.close();
      return res.status(404).json({ error: "Student not found" });
    }
    // link parent ↔ student
    await db.run(
      `INSERT OR IGNORE INTO parent_student (parent_id, student_id)
       VALUES (?, ?)`,
      [req.params.id, student.id]
    );
    await db.close();
    res.json({
      id: student.id,
      name: `${student.first_name} ${student.last_name}`,
      email: student.email,
    });
  } catch (err) {
    console.error("Could not add child:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;