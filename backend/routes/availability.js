/* ------------------------------------------------------------------
 * backend/routes/availability.js
 * ------------------------------------------------------------------ */
const express = require("express");
const router  = express.Router();
const { getDbConnection } = require("../db");
const { format } = require("date-fns");           // ← NEW: used for local time

/* ------------------------------------------------------------------
 * helper: split an ISO string into local date + time parts
 *         (was using toISOString → UTC; now stays local)
 * ------------------------------------------------------------------ */
function splitISO(isoStr) {
  const d = new Date(isoStr);
  return {
    date:       format(d, "yyyy-MM-dd"),  // 2025-05-20  (local)
    timeString: format(d, "HH:mm"),       // 09:00       (local 24-h)
  };
}

/* ------------------------------------------------------------------
 *  POST /api/availability
 *  Accepts:
 *    • ISO one-off   { therapist_id, start, end }
 *    • legacy one-off{ therapist_id, date, start_time, end_time }
 *    • weekly pattern{ therapist_id, recurring:1, days:[…], start_time, end_time }
 * ------------------------------------------------------------------ */
router.post("/", async (req, res) => {
  try {
    const {
      therapist_id,
      start, end,                 // ISO format
      date, start_time, end_time, // legacy format
      recurring = 0,
      days = [],
    } = req.body;

    if (!therapist_id)
      return res.status(400).json({ error: "therapist_id missing" });

    const db = await getDbConnection();

    /* ---------- 1. ISO one-off slot ---------- */
    if (!recurring && start && end) {
      const { date: dISO, timeString: st } = splitISO(start);
      const { timeString: et }             = splitISO(end);

      await db.run(
        `INSERT INTO availability
           (therapist_id, date, start_time, end_time, is_recurring)
         VALUES (?, ?, ?, ?, 0)`,
        [therapist_id, dISO, st, et]
      );
      await db.close();
      return res.json({ success: true });
    }

    /* ---------- 2. legacy one-off ---------- */
    if (!recurring) {
      await db.run(
        `INSERT INTO availability
           (therapist_id, date, start_time, end_time, is_recurring)
         VALUES (?, ?, ?, ?, 0)`,
        [therapist_id, date, start_time, end_time]
      );
      await db.close();
      return res.json({ success: true });
    }

    /* ---------- 3. weekly recurring pattern ---------- */
    const stmt = await db.prepare(
      `INSERT INTO availability
         (therapist_id, day_of_week, start_time, end_time, is_recurring)
       VALUES (?, ?, ?, ?, 1)`
    );
    for (const d of days) {
      await stmt.run(therapist_id, d, start_time, end_time);
    }
    await stmt.finalize();
    await db.close();
    res.json({ success: true });
  } catch (err) {
    console.error("Availability create error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ------------------------------------------------------------------
 *  DELETE /api/availability/:id
 * ------------------------------------------------------------------ */
router.delete("/:id", async (req, res) => {
  try {
    const db = await getDbConnection();
    await db.run(
      `DELETE FROM availability WHERE availability_id = ?`,
      [req.params.id]
    );
    await db.close();
    res.json({ success: true });
  } catch (err) {
    console.error("Availability delete error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ------------------------------------------------------------------
 *  GET /api/availability?therapist_id=…
 *  Returns rows plus ready-made ISO start/end strings so the
 *  front-end calendar can render immediately.
 * ------------------------------------------------------------------ */
router.get("/", async (req, res) => {
  try {
    const { therapist_id } = req.query;
    if (!therapist_id) return res.json([]);

    const db   = await getDbConnection();
    const rows = await db.all(
      `SELECT
         availability_id AS id,
         date,
         start_time,
         end_time,
         is_recurring,
         day_of_week
       FROM availability
       WHERE therapist_id = ?`,
      [therapist_id]
    );
    await db.close();

    const enriched = rows.map((r) => {
      if (r.date) {
        r.start = `${r.date}T${r.start_time}`;
        r.end   = `${r.date}T${r.end_time}`;
      }
      return r;
    });

    res.json(enriched);
  } catch (err) {
    console.error("Fetch availability error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;