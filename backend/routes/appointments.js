// backend/routes/appointments.js
const express = require("express");
const router  = express.Router();
const { getDbConnection } = require("../db");
const { format } = require("date-fns");
const { sendGenericEmail } = require("../emailService");

/* ------------------------------------------------------------------
 * helper: split an ISO string into local pieces
 * ------------------------------------------------------------------ */
function splitISO(iso) {
  const d = new Date(iso);
  return {
    date: format(d, "yyyy-MM-dd"),
    time: format(d, "HH:mm"),
    iso:  d.toISOString(),
  };
}

/* ------------------------------------------------------------------
 * get emails for appointment parties
 * ------------------------------------------------------------------ */
async function getEmails({ student_id, parent_id, therapist_id }) {
  const db = await getDbConnection();
  const userInfo = {};

  if (student_id) {
    const s = await db.get("SELECT email, first_name, last_name FROM student_account WHERE student_id = ?", [student_id]);
    if (s) userInfo.student = { 
      email: s.email, 
      name: [s.first_name, s.last_name].filter(Boolean).join(" ") 
    };
  }
  if (parent_id) {
    const p = await db.get("SELECT email, first_name, last_name FROM parent_account WHERE parent_id = ?", [parent_id]);
    if (p) userInfo.parent = { 
      email: p.email, 
      name: [p.first_name, p.last_name].filter(Boolean).join(" ") 
    };
  }
  if (therapist_id) {
    const t = await db.get("SELECT email, first_name, last_name FROM therapist_account WHERE therapist_id = ?", [therapist_id]);
    if (t) userInfo.therapist = { 
      email: t.email, 
      name: [t.first_name, t.last_name].filter(Boolean).join(" ") 
    };
  }
  await db.close();
  return userInfo;
}

function makeEmailHTML({ type, date, start_time, end_time, status, student, parent, therapist, actionBy }) {
  return `
    <div>
      <h2>Appointment ${type === "session" ? "Session" : "Request"} Updated</h2>
      <p>
        <b>Date:</b> ${date}<br/>
        <b>Time:</b> ${start_time} - ${end_time}<br/>
        <b>Status:</b> ${status}<br/>
        <b>Student:</b> ${student?.name || "-"}<br/>
        <b>Parent:</b> ${parent?.name || "-"}<br/>
        <b>Therapist:</b> ${therapist?.name || "-"}<br/>
        <b>Updated by:</b> ${actionBy}<br/>
      </p>
      <p>Please log in to view more details or take action if needed.</p>
    </div>
  `;
}

async function notifyAll({ student_id, parent_id, therapist_id, type, date, start_time, end_time, status, actionBy }) {
  const userInfo = await getEmails({ student_id, parent_id, therapist_id });
  const toEmails = [
    userInfo.student?.email,
    userInfo.parent?.email,
    userInfo.therapist?.email
  ].filter(Boolean);

  const html = makeEmailHTML({
    type, date, start_time, end_time, status,
    student: userInfo.student,
    parent: userInfo.parent,
    therapist: userInfo.therapist,
    actionBy
  });

  const subject = `Appointment ${status[0].toUpperCase() + status.slice(1)} - ${date} ${start_time}`;
  for (const toEmail of toEmails) {
    await sendGenericEmail(toEmail, subject, html);
  }
}

/* ------------------------------------------------------------------
 * POST /api/appointments
 * ------------------------------------------------------------------ */
router.post("/", async (req, res) => {
  try {
    const {
      student_id,
      parent_id    = null,
      therapist_id,
      start, end,
      start_time, end_time,
      date,
      status = "pending",
      type   = "session",
    } = req.body;

    if (!student_id || !therapist_id || !(start && end) && !(date && start_time && end_time)) {
      console.error("Missing required fields in POST /api/appointments:", req.body);
      return res.status(400).json({ error: "missing required fields" });
    }

    /* normalise inputs */
    const d = date
      ? { date, start_time, end_time, start_iso: `${date}T${start_time}`, end_iso: `${date}T${end_time}` }
      : (() => {
          const { date: d1, time: st } = splitISO(start);
          const { time: et }           = splitISO(end);
          return { date: d1, start_time: st, end_time: et, start_iso: start, end_iso: end };
        })();

    const db = await getDbConnection();
    const result = await db.run(
      `INSERT INTO appointments
         (student_id, parent_id, therapist_id, start_time, end_time, date, status, type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        student_id,
        parent_id,
        therapist_id,
        d.start_time,
        d.end_time,
        d.date,
        status,
        type,
      ]
    );
    await db.close();

    // Email everyone
    await notifyAll({
      student_id, parent_id, therapist_id, type,
      date: d.date, start_time: d.start_time, end_time: d.end_time, status,
      actionBy: 'System (appointment requested)'
    });

    res.json({
      id: result.lastID,
      student_id,
      parent_id,
      therapist_id,
      status,
      type,
      date: d.date,
      start_time: d.start_time,
      end_time: d.end_time,
      start: d.start_iso,
      end: d.end_iso,
    });
  } catch (err) {
    console.error("Appointment create error:", err, req.body);
    res.status(500).json({ error: err.message });
  }
});

/* ------------------------------------------------------------------
 * GET /api/appointments?[student_id=&parent_id=&therapist_id=&status=]
 * ------------------------------------------------------------------ */
router.get("/", async (req, res) => {
  try {
    const { student_id, parent_id, therapist_id, status } = req.query;
    const clauses = [];
    const params  = [];

    if (student_id)    { clauses.push("student_id   = ?"); params.push(student_id); }
    if (parent_id)     { clauses.push("parent_id    = ?"); params.push(parent_id); }
    if (therapist_id)  { clauses.push("therapist_id = ?"); params.push(therapist_id); }
    if (status)        { clauses.push("status       = ?"); params.push(status); }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const db    = await getDbConnection();
    const rows  = await db.all(`SELECT * FROM appointments ${where}`, params);
    await db.close();

    const enriched = rows.map((r) => ({
      ...r,
      id: r.appointment_id, // alias for frontend
      start: `${r.date}T${r.start_time}`,
      end:   `${r.date}T${r.end_time}`,
    }));

    res.json(enriched);
  } catch (err) {
    console.error("Fetch appointments error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ------------------------------------------------------------------
 * PUT /api/appointments/:id
 * ------------------------------------------------------------------ */
router.put("/:id", async (req, res) => {
  try {
    const {
      student_id,
      parent_id,
      therapist_id,
      start, end,
      start_time,
      end_time,
      date,
      status,
      type,
    } = req.body;

    /* normalise times if ISO strings provided */
    const norm = start && end
      ? (() => {
          const s = splitISO(start);
          const e = splitISO(end);
          return { date: s.date, start_time: s.time, end_time: e.time };
        })()
      : { date, start_time, end_time };

    const fields = [];
    const params = [];

    if (student_id   !== undefined) { fields.push("student_id   = ?"); params.push(student_id); }
    if (parent_id    !== undefined) { fields.push("parent_id    = ?"); params.push(parent_id); }
    if (therapist_id !== undefined) { fields.push("therapist_id = ?"); params.push(therapist_id); }
    if (norm.start_time)            { fields.push("start_time   = ?"); params.push(norm.start_time); }
    if (norm.end_time)              { fields.push("end_time     = ?"); params.push(norm.end_time); }
    if (norm.date)                  { fields.push("date         = ?"); params.push(norm.date); }
    if (status)                     { fields.push("status       = ?"); params.push(status); }
    if (type)                       { fields.push("type         = ?"); params.push(type); }

    if (fields.length === 0) return res.json({ message: "nothing to update" });

    params.push(req.params.id);

    const db = await getDbConnection();
    await db.run(`UPDATE appointments SET ${fields.join(", ")} WHERE appointment_id = ?`, params);

    // Get current row for info/email
    const updated = await db.get("SELECT * FROM appointments WHERE appointment_id = ?", [req.params.id]);
    await db.close();

    // Email everyone
    await notifyAll({
      student_id: updated.student_id,
      parent_id: updated.parent_id,
      therapist_id: updated.therapist_id,
      type: updated.type,
      date: updated.date,
      start_time: updated.start_time,
      end_time: updated.end_time,
      status: updated.status,
      actionBy: 'System (appointment updated)'
    });

    res.json({ message: "Appointment updated" });
  } catch (err) {
    console.error("Appointment update error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ------------------------------------------------------------------
 * DELETE /api/appointments/:id
 * ------------------------------------------------------------------ */
router.delete("/:id", async (req, res) => {
  try {
    // Get appointment for info/email
    const db = await getDbConnection();
    const row = await db.get("SELECT * FROM appointments WHERE appointment_id = ?", [req.params.id]);
    await db.run("DELETE FROM appointments WHERE appointment_id = ?", [req.params.id]);
    await db.close();

    if (row) {
      await notifyAll({
        student_id: row.student_id,
        parent_id: row.parent_id,
        therapist_id: row.therapist_id,
        type: row.type,
        date: row.date,
        start_time: row.start_time,
        end_time: row.end_time,
        status: "deleted",
        actionBy: 'System (appointment deleted)'
      });
    }

    res.json({ message: "Appointment deleted" });
  } catch (err) {
    console.error("Appointment delete error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;