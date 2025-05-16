// backend/routes/appointments.js
const express = require("express");
const router = express.Router();
const { getDbConnection } = require("../db");

// Create an appointment
router.post("/", async (req, res) => {
  try {
    const {
      student_id,
      parent_id,
      therapist_id,
      start_time,
      end_time,
      date,
      status,
      type
    } = req.body;

    const db = await getDbConnection();
    const result = await db.run(
      `INSERT INTO appointments
         (student_id, parent_id, therapist_id, start_time, end_time, date, status, type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [student_id, parent_id, therapist_id, start_time, end_time, date, status, type]
    );
    await db.close();

    res.json({ appointment_id: result.lastID, ...req.body });
  } catch (err) {
    console.error("Appointment create error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Grab all appointments
router.get("/", async (_req, res) => {
  try {
    const db = await getDbConnection();
    const rows = await db.all("SELECT * FROM appointments");
    await db.close();
    res.json(rows);
  } catch (err) {
    console.error("Fetch appointments error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Grab a single appointment
router.get("/:id", async (req, res) => {
  try {
    const db = await getDbConnection();
    const row = await db.get(
      "SELECT * FROM appointments WHERE appointment_id = ?",
      [req.params.id]
    );
    await db.close();
    if (!row) return res.status(404).json({ error: "Appointment not found" });
    res.json(row);
  } catch (err) {
    console.error("Fetch single appointment error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update an appointment
router.put("/:id", async (req, res) => {
  try {
    const {
      student_id,
      parent_id,
      therapist_id,
      start_time,
      end_time,
      date,
      status,
      type
    } = req.body;

    const db = await getDbConnection();
    await db.run(
      `UPDATE appointments
         SET student_id   = ?, 
             parent_id    = ?, 
             therapist_id = ?, 
             start_time   = ?, 
             end_time     = ?, 
             date         = ?, 
             status       = ?, 
             type         = ?
       WHERE appointment_id = ?`,
      [
        student_id,
        parent_id,
        therapist_id,
        start_time,
        end_time,
        date,
        status,
        type,
        req.params.id
      ]
    );
    await db.close();

    res.json({ message: "Appointment updated successfully" });
  } catch (err) {
    console.error("Appointment update error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete an appointment
router.delete("/:id", async (req, res) => {
  try {
    const db = await getDbConnection();
    await db.run(
      "DELETE FROM appointments WHERE appointment_id = ?",
      [req.params.id]
    );
    await db.close();
    res.json({ message: "Appointment deleted successfully" });
  } catch (err) {
    console.error("Appointment delete error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;