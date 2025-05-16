import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Views, dateFnsLocalizer } from 'react-big-calendar';
import {
  format, parse, startOfWeek, getDay, addWeeks,
} from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import axios from 'axios';

/* ---------- helpers ---------- */
const locales   = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });
const PURPLE    = '#805ad5';
const LIGHT_BG  = '#faf5ff';
const DAYS      = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ------------------------------------------------------------------ */
/* TherapistPage */
/* ------------------------------------------------------------------ */
export default function TherapistPage({ therapistId }) {
  /* ---------- 🔑 ensure we always have the ID ---------- */
  const tid = useMemo(() => {
    if (therapistId) return therapistId;

    // Try the user object persisted after login
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.role === 'therapist' ? user.id : null;
    } catch {
      return null;
    }
  }, [therapistId]);

  /* ---------- state ---------- */
  const [availability, setAvailability] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [pending,      setPending]      = useState([]);
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [view,         setView]         = useState(Views.MONTH);
  const [date,         setDate]         = useState(new Date());
  const [clock,        setClock]        = useState(new Date());

  // weekly rows: enabled?, start, end
  const [weekly, setWeekly] = useState(
    DAYS.map(() => ({ enabled: false, start: '', end: '' }))
  );

  /* ---------- live clock ---------- */
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ---------- load profile & data ---------- */
  useEffect(() => {
    if (!tid) return;                   // still not logged-in / not a therapist
    fetchAll();
    axios
      .get(`/api/therapists/${tid}`)
      .then((res) =>
        setSpecialtyInput((res.data.specialties || []).join(', '))
      )
      .catch((err) => console.error('Failed to load specialties:', err));
  }, [tid]);

  const fetchAll = () => {
    axios
      .get(`/api/availability?therapist_id=${tid}`)
      .then((res) => setAvailability(res.data));
    axios
      .get(`/api/appointments?therapist_id=${tid}&status=accepted`)
      .then((res) => setAppointments(res.data));
    axios
      .get(`/api/appointments?therapist_id=${tid}&status=pending`)
      .then((res) => setPending(res.data));
  };

  /* ---------- specialties ---------- */
  const saveSpecialties = () => {
    const list =
      specialtyInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

    axios
      .put(`/api/therapists/${tid}`, { specialties: list })
      .then(() => alert('Specialties updated'))
      .catch(() => alert('Failed to save specialties'));
  };

  /* ---------- weekly availability UI ---------- */
  const toggleDay = (i) =>
    setWeekly((rows) =>
      rows.map((r, idx) =>
        idx === i ? { ...r, enabled: !r.enabled } : r
      )
    );

  const setTime = (i, field, val) =>
    setWeekly((rows) =>
      rows.map((r, idx) =>
        idx === i ? { ...r, [field]: val } : r
      )
    );

  /* ---------- save weekly pattern ---------- */
  const saveWeeklyPattern = async () => {
    const active = weekly.filter(
      (d) => d.enabled && d.start && d.end && d.start < d.end
    );
    if (active.length === 0) {
      return alert('Pick at least one day with valid times.');
    }

    try {
      const now   = new Date();
      const base  = startOfWeek(now);
      const reqs  = [];

      for (let w = 0; w < 4; w++) {
        active.forEach(({ start, end }, idx) => {
          const dayDate = addWeeks(base, w);
          dayDate.setDate(dayDate.getDate() + idx);

          const startISO = `${format(dayDate, 'yyyy-MM-dd')}T${start}`;
          const endISO   = `${format(dayDate, 'yyyy-MM-dd')}T${end}`;

          reqs.push(
            axios.post('/api/availability', {
              therapist_id: tid,
              start: startISO,
              end:   endISO,
            })
          );
        });
      }

      await Promise.all(reqs);
      alert('Weekly availability saved');
      setWeekly(DAYS.map(() => ({ enabled: false, start: '', end: '' })));
      fetchAll();
    } catch (err) {
      console.error(err);
      alert('Failed to save weekly availability');
    }
  };

  /* ---------- delete availability ---------- */
  const deleteSlot = (slot) =>
    axios
      .delete(`/api/availability/${slot.id}`)
      .then(fetchAll)
      .catch(console.error);

  /* ---------- render ---------- */
  if (!tid)
    return (
      <div style={{ padding: 40, fontFamily: 'Inter, sans-serif' }}>
        <h2>Please log in as a therapist first.</h2>
      </div>
    );

  return (
    <div style={styles.pageWrapper}>
      <main style={styles.mainContent}>
        <h2 style={styles.heading}>Therapist Dashboard</h2>
        <div style={styles.timestamp}>
          {format(clock, 'EEEE, MMMM d, yyyy - hh:mm:ss a')}
        </div>

        {/* Specialties */}
        <section style={styles.card}>
          <h3 style={styles.sectionTitle}>🔧 Your Specialties</h3>
          <textarea
            rows={2}
            value={specialtyInput}
            onChange={(e) => setSpecialtyInput(e.target.value)}
            placeholder="Enter comma-separated specialties"
            style={styles.textarea}
          />
          <button onClick={saveSpecialties} style={styles.acceptBtn}>
            Save Specialties
          </button>
        </section>

        {/* Pending requests */}
        <section style={styles.card}>
          <h3 style={styles.sectionTitle}>📬 Pending Requests</h3>
          {pending.length === 0 ? (
            <p style={styles.emptyText}>No requests</p>
          ) : (
            pending.map((req) => (
              <div key={req.id} style={styles.requestBox}>
                <div>
                  <strong>{req.student_name}</strong>
                  <br />
                  {format(new Date(req.start), 'MMM d, hh:mm a')} –{' '}
                  {format(new Date(req.end), 'hh:mm a')}
                </div>
                <div>
                  <button
                    onClick={() => axios.put(`/api/appointments/${req.id}`, { status: 'accepted' }).then(fetchAll)}
                    style={styles.acceptBtn}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => axios.put(`/api/appointments/${req.id}`, { status: 'declined' }).then(fetchAll)}
                    style={styles.declineBtn}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))
          )}
        </section>

        {/* Weekly availability */}
        <section style={styles.card}>
          <h3 style={styles.sectionTitle}>🗓️ Weekly Availability</h3>
          {weekly.map((d, i) => (
            <div key={DAYS[i]} style={styles.row}>
              <input
                type="checkbox"
                checked={d.enabled}
                onChange={() => toggleDay(i)}
              />
              <span style={{ width: 40 }}>{DAYS[i]}</span>
              {d.enabled && (
                <>
                  <input
                    type="time"
                    value={d.start}
                    onChange={(e) => setTime(i, 'start', e.target.value)}
                    style={styles.input}
                  />
                  <span>to</span>
                  <input
                    type="time"
                    value={d.end}
                    onChange={(e) => setTime(i, 'end', e.target.value)}
                    style={styles.input}
                  />
                </>
              )}
            </div>
          ))}
          <button onClick={saveWeeklyPattern} style={styles.acceptBtn}>
            Save Weekly Pattern
          </button>
        </section>

        {/* Calendar */}
        <section style={styles.card}>
          <h3 style={styles.sectionTitle}>📅 Your Calendar</h3>
          <Calendar
            localizer={localizer}
            events={[
              ...availability.map((s) => ({ ...s, title: 'Available', isAvail: true })),
              ...appointments.map((a) => ({ ...a, title: 'Booked' })),
            ]}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 400 }}
            selectable
            view={view}
            date={date}
            onView={setView}
            onNavigate={setDate}
            onSelectEvent={(evt) =>
              evt.isAvail && window.confirm('Delete this slot?') && deleteSlot(evt)
            }
            views={[Views.MONTH, Views.WEEK, Views.DAY]}
          />
        </section>

        <Link to="/">
          <button style={styles.homeBtn}>🏠 Home</button>
        </Link>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* styles */
/* ------------------------------------------------------------------ */
const styles = {
  pageWrapper: {
    fontFamily: 'Inter, sans-serif',
    background: '#f9f9fb',
    minHeight: '100vh',
    paddingBottom: 40,
  },
  mainContent: {
    maxWidth: 960,
    margin: '40px auto',
    padding: '0 20px',
    textAlign: 'center',
  },
  heading: { fontSize: '2.25rem', marginBottom: 8, color: PURPLE, fontWeight: 700 },
  timestamp: {
    fontFamily: 'Courier New, monospace',
    background: '#eef2ff',
    padding: '0.4rem 1rem',
    borderRadius: 8,
    display: 'inline-block',
    marginBottom: 32,
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: '1.5rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    marginBottom: 32,
    textAlign: 'left',
  },
  sectionTitle: { color: PURPLE, fontSize: '1.3rem', marginBottom: 16, fontWeight: 600 },
  textarea: { width: '100%', padding: '0.5rem', borderRadius: 6, border: `1px solid ${PURPLE}` },
  row: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  input: { flex: '1 1 120px', padding: '0.4rem', borderRadius: 6, border: `1px solid ${PURPLE}` },
  acceptBtn: { background: PURPLE, color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: 8, fontWeight: 600, cursor: 'pointer' },
  declineBtn: { background: '#e53e3e', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: 8, cursor: 'pointer' },
  requestBox: { background: LIGHT_BG, borderLeft: `4px solid ${PURPLE}`, padding: '1rem', marginBottom: 12, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  emptyText: { color: '#888', fontStyle: 'italic' },
  homeBtn: { background: PURPLE, color: '#fff', border: 'none', padding: '0.75rem 2rem', borderRadius: 8, fontSize: '1rem', fontWeight: 600, cursor: 'pointer' },
};