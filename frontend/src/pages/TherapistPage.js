import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Views, dateFnsLocalizer } from 'react-big-calendar';
import {
  format,
  parse,
  startOfWeek,
  getDay,
  addWeeks,
} from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import axios from 'axios';

const locales   = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const PURPLE    = '#805ad5';
const LIGHT_BG  = '#faf5ff';
const DAYS      = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TherapistPage({ therapistId }) {
  if (!therapistId) {
    return (
      <div style={{ padding: 40, fontFamily: 'Inter, sans-serif' }}>
        <h2>Therapist ID missing – cannot load dashboard.</h2>
      </div>
    );
  }

  const [availability,   setAvailability]   = useState([]);
  const [appointments,   setAppointments]   = useState([]);
  const [pending,        setPending]        = useState([]);
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [view,           setView]           = useState(Views.MONTH);
  const [date,           setDate]           = useState(new Date());
  const [clock,          setClock]          = useState(new Date());
  const [weekly,         setWeekly]         = useState(
    DAYS.map(() => ({ enabled: false, start: '', end: '' }))
  );

  // Modal for appointment info
  const [modalOpen, setModalOpen]     = useState(false);
  const [modalAppt, setModalAppt]     = useState(null);

  // -- AUTO UPDATE: fetch every 10 seconds for calendar & requests sync --
  useEffect(() => {
    fetchAll();
    axios
      .get(`/api/therapists/${therapistId}`)
      .then(res =>
        setSpecialtyInput((res.data.specialties || []).join(', '))
      )
      .catch(err => console.error('Failed to load specialties:', err));
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, []);

  const fetchAll = () => {
    axios
      .get(`/api/availability?therapist_id=${therapistId}`)
      .then(res => setAvailability(res.data));
    axios
      .get(`/api/appointments?therapist_id=${therapistId}`)
      .then(res => {
        setAppointments(
          res.data
            .filter(a => a.status === 'accepted')
            .map((a) => ({
              ...a,
              title: 'Booked',
              start: new Date(a.start),
              end:   new Date(a.end),
              id: a.id,
              status: a.status,
              student_name: a.student_name,
            }))
        );
        setPending(
          res.data
            .filter(a => a.status === 'pending')
            .map((a) => ({
              ...a,
              start: new Date(a.start),
              end:   new Date(a.end),
            }))
        );
      });
  };

  const saveSpecialties = () => {
    const list = specialtyInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    axios
      .put(`/api/therapists/${therapistId}`, { specialties: list })
      .then(() => alert('Specialties updated'))
      .catch(() => alert('Failed to save specialties'));
  };

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

  const saveWeeklyPattern = async () => {
    const active = weekly
      .map((row, idx) => ({ ...row, dow: idx }))
      .filter((d) => d.enabled && d.start && d.end && d.start < d.end);

    if (active.length === 0) {
      return alert('Pick at least one day with valid times.');
    }

    try {
      const base = startOfWeek(new Date());
      const reqs = [];

      for (let w = 0; w < 4; w++) {
        active.forEach(({ dow, start, end }) => {
          const dayDate = addWeeks(base, w);
          dayDate.setDate(dayDate.getDate() + dow);

          reqs.push(
            axios.post('/api/availability', {
              therapist_id: therapistId,
              start: `${format(dayDate, 'yyyy-MM-dd')}T${start}`,
              end:   `${format(dayDate, 'yyyy-MM-dd')}T${end}`,
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
      alert('Failed to save weekly availability (check console).');
    }
  };

  const deleteSlot = (slot) =>
    axios
      .delete(`/api/availability/${slot.id}`)
      .then(fetchAll)
      .catch(console.error);

  // Calendar modal logic
  const toDate = (val) => (val instanceof Date ? val : new Date(val));
  const handleSelectEvent = (evt) => {
    if (evt.isAvail) {
      if (window.confirm('Delete this slot?')) deleteSlot(evt);
    } else {
      setModalAppt(evt);
      setModalOpen(true);
    }
  };
  const closeModal = () => {
    setModalOpen(false);
    setModalAppt(null);
  };
  const cancelAppointment = (id) =>
    axios
      .put(`/api/appointments/${id}`, { status: 'cancelled' })
      .then(() => {
        fetchAll();
        closeModal();
      });

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={styles.pageWrapper}>
      <main style={styles.mainContent}>
        <h2 style={styles.heading}>Therapist Dashboard</h2>
        <div style={styles.timestamp}>
          {format(clock, 'EEEE, MMMM d, yyyy - hh:mm:ss a')}
        </div>

        {/* Specialties ------------------------------------------------ */}
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

        {/* Pending requests ----------------------------------------- */}
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
                  {format(req.start, 'MMM d, hh:mm a')} –{' '}
                  {format(req.end, 'hh:mm a')}
                </div>
                <div>
                  <button
                    onClick={() =>
                      axios
                        .put(`/api/appointments/${req.id}`, { status: 'accepted' })
                        .then(fetchAll)
                    }
                    style={styles.acceptBtn}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() =>
                      axios
                        .put(`/api/appointments/${req.id}`, { status: 'declined' })
                        .then(fetchAll)
                    }
                    style={styles.declineBtn}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))
          )}
        </section>

        {/* Weekly availability -------------------------------------- */}
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

        {/* Calendar -------------------------------------------------- */}
        <section style={styles.card}>
          <h3 style={styles.sectionTitle}>📅 Your Calendar</h3>
          <Calendar
            localizer={localizer}
            events={[
              ...availability.map((s) => ({
                ...s,
                title: 'Available',
                isAvail: true,
                start: toDate(s.start ?? `${s.date}T${s.start_time}`),
                end:   toDate(s.end   ?? `${s.date}T${s.end_time}`),
              })),
              ...appointments
            ]}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 400 }}
            selectable
            view={view}
            date={date}
            onView={setView}
            onNavigate={setDate}
            onSelectEvent={handleSelectEvent}
            views={[Views.MONTH, Views.WEEK, Views.DAY]}
          />
        </section>

        {/* Modal for appointment details/cancel */}
        {modalOpen && modalAppt && (
          <div style={styles.modalOverlay} onClick={closeModal}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
              <h3 style={{ color: PURPLE, marginBottom: 12 }}>Appointment Details</h3>
              <div><b>Student:</b> {modalAppt.student_name}</div>
              <div><b>Time:</b> {format(modalAppt.start, 'MMM d, yyyy, hh:mm a')} – {format(modalAppt.end, 'hh:mm a')}</div>
              <div><b>Status:</b> {modalAppt.status}</div>
              <div style={{ marginTop: 20 }}>
                {['pending', 'accepted'].includes(modalAppt.status) && (
                  <button onClick={() => cancelAppointment(modalAppt.id)} style={styles.declineBtn}>Cancel Appointment</button>
                )}
                <button onClick={closeModal} style={styles.acceptBtn}>Close</button>
              </div>
            </div>
          </div>
        )}

        <Link to="/">
          <button style={styles.homeBtn}>🏠 Home</button>
        </Link>
      </main>
    </div>
  );
}

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
  heading: {
    fontSize: '2.25rem',
    marginBottom: 8,
    color: PURPLE,
    fontWeight: 700,
  },
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
  sectionTitle: {
    color: PURPLE,
    fontSize: '1.3rem',
    marginBottom: 16,
    fontWeight: 600,
  },
  textarea: {
    width: '100%',
    padding: '0.5rem',
    borderRadius: 6,
    border: `1px solid ${PURPLE}`,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  input: {
    flex: '1 1 120px',
    padding: '0.4rem',
    borderRadius: 6,
    border: `1px solid ${PURPLE}`,
  },
  acceptBtn: {
    background: PURPLE,
    color: '#fff',
    border: 'none',
    padding: '0.6rem 1.2rem',
    borderRadius: 8,
    fontWeight: 600,
    cursor: 'pointer',
  },
  declineBtn: {
    background: '#e53e3e',
    color: '#fff',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: 8,
    cursor: 'pointer',
  },
  requestBox: {
    background: LIGHT_BG,
    borderLeft: `4px solid ${PURPLE}`,
    padding: '1rem',
    marginBottom: 12,
    borderRadius: 8,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyText: { color: '#888', fontStyle: 'italic' },
  homeBtn: {
    background: PURPLE,
    color: '#fff',
    border: 'none',
    padding: '0.75rem 2rem',
    borderRadius: 8,
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
    background: 'rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001,
  },
  modal: {
    background: '#fff', borderRadius: 14, padding: 28, boxShadow: '0 6px 30px rgba(0,0,0,0.13)', minWidth: 320,
  },
};