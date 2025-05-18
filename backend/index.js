// backend/index.js
require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const { getDbConnection } = require("./db");

const studentRoutes      = require("./routes/students");
const parentRoutes       = require("./routes/parents");
const parentStudents     = require("./routes/parentStudents");
const therapistRoutes    = require("./routes/therapists");
const appointmentRoutes  = require("./routes/appointments");
const availabilityRoutes = require("./routes/availability");
const adminRoutes        = require("./routes/admins");
const authRoutes         = require("./routes/auth");

const app = express();
app.use(cors());
app.use(express.json());

/* -----------------------------------------------------------
 * Auth endpoints first (verify / resend, etc.)
 * ----------------------------------------------------------- */
app.use("/api/auth", authRoutes);

/* -----------------------------------------------------------
 * Dev-mode migration: DROP & CREATE every table at start-up
 * (in prod you’d move this to proper migrations 🤓)
 * ----------------------------------------------------------- */
(async () => {
  try {
    const db = await getDbConnection();

    /* ---------- DROP old tables ---------- */
    await db.run(`DROP TABLE IF EXISTS student_account`);
    await db.run(`DROP TABLE IF EXISTS parent_account`);
    await db.run(`DROP TABLE IF EXISTS therapist_account`);
    await db.run(`DROP TABLE IF EXISTS appointments`);
    await db.run(`DROP TABLE IF EXISTS admin_account`);
    await db.run(`DROP TABLE IF EXISTS availability`);
    await db.run(`DROP TABLE IF EXISTS parent_student`);
    await db.run(`DROP TABLE IF EXISTS therapist_specialties`);

    /* ---------- student_account ---------- */
    await db.run(`
      CREATE TABLE student_account (
        student_id     INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name     TEXT,
        last_name      TEXT,
        phone_number   TEXT,
        age            INTEGER,
        address        TEXT,
        zip_code       TEXT,
        email          TEXT UNIQUE NOT NULL,
        password       TEXT NOT NULL,
        email_verified INTEGER DEFAULT 0,
        reset_token       TEXT,
        reset_token_expiry TEXT,
        verify_token   TEXT
      );
    `);

    /* ---------- parent_account ---------- */
    await db.run(`
      CREATE TABLE parent_account (
        parent_id      INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name     TEXT,
        last_name      TEXT,
        phone_number   TEXT,
        age            INTEGER,
        address        TEXT,
        zip_code       TEXT,
        email          TEXT UNIQUE NOT NULL,
        password       TEXT NOT NULL,
        email_verified INTEGER DEFAULT 0,
        reset_token       TEXT,
        reset_token_expiry TEXT,
        verify_token   TEXT
      );
    `);

    /* ---------- therapist_account ---------- */
    await db.run(`
      CREATE TABLE therapist_account (
        therapist_id   INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name     TEXT,
        last_name      TEXT,
        phone_number   TEXT,
        age            INTEGER,
        address        TEXT,
        zip_code       TEXT,
        email          TEXT UNIQUE NOT NULL,
        password       TEXT NOT NULL,
        email_verified INTEGER DEFAULT 0,
        verify_token   TEXT,
        admin_id       INTEGER,
        approval_date  TEXT,
        reset_token       TEXT,
        reset_token_expiry TEXT,
        FOREIGN KEY(admin_id) REFERENCES admin_account(admin_id)
      );
    `);

    /* ---------- appointments (with parent_id) ---------- */
    await db.run(`
      CREATE TABLE appointments (
        appointment_id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id     INTEGER NOT NULL,
        parent_id      INTEGER, -- nullable, only set for parent bookings
        therapist_id   INTEGER NOT NULL,
        start_time     TEXT    NOT NULL,
        end_time       TEXT    NOT NULL,
        date           TEXT    NOT NULL,
        status         TEXT    NOT NULL,
        type           TEXT    NOT NULL,
        FOREIGN KEY(student_id)   REFERENCES student_account(student_id),
        FOREIGN KEY(parent_id)    REFERENCES parent_account(parent_id),
        FOREIGN KEY(therapist_id) REFERENCES therapist_account(therapist_id)
      );
    `);

    /* ---------- admin_account ---------- */
    await db.run(`
      CREATE TABLE admin_account (
        admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
        email    TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      );
    `);

    /* ---------- ✅ NEW availability (with is_recurring & day_of_week) ---------- */
    await db.run(`
      CREATE TABLE availability (
        availability_id INTEGER PRIMARY KEY AUTOINCREMENT,
        therapist_id    INTEGER NOT NULL,
        date            TEXT,          -- NULL when recurring
        start_time      TEXT NOT NULL,
        end_time        TEXT NOT NULL,
        is_recurring    INTEGER DEFAULT 0,
        day_of_week     INTEGER,       -- 0 = Sun … 6 = Sat (only when recurring)
        FOREIGN KEY(therapist_id) REFERENCES therapist_account(therapist_id)
      );
    `);

    /* ---------- joins ---------- */
    await db.run(`
      CREATE TABLE parent_student (
        parent_id  INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        PRIMARY KEY (parent_id, student_id),
        FOREIGN KEY (parent_id)  REFERENCES parent_account(parent_id),
        FOREIGN KEY (student_id) REFERENCES student_account(student_id)
      );
    `);

    await db.run(`
      CREATE TABLE therapist_specialties (
        therapist_id INTEGER NOT NULL,
        specialty    TEXT    NOT NULL,
        PRIMARY KEY (therapist_id, specialty),
        FOREIGN KEY (therapist_id) REFERENCES therapist_account(therapist_id)
      );
    `);

    await db.close();
    console.log("✅ Tables dropped & recreated (dev mode).");
  } catch (err) {
    console.error("Migration error:", err);
  }
})();

/* -----------------------------------------------------------
 * Mount the rest of the routes
 * ----------------------------------------------------------- */
app.use("/api/students",     studentRoutes);
app.use("/api/parents",      parentRoutes);
app.use("/api/parents",      parentStudents);
app.use("/api/therapists",   therapistRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/admins",       adminRoutes);

/* -----------------------------------------------------------
 * Home-page sanity ping
 * ----------------------------------------------------------- */
app.get("/", (_req, res) => res.send("API running!"));

const port = process.env.PORT || 4000;
app.listen(port, () =>
  console.log(`Server started on port ${port}`)
);