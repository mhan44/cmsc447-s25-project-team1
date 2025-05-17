import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Views, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import axios from 'axios';

const locales   = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });
const PURPLE    = '#805ad5';
const LIGHT_BG  = '#faf5ff';

export default function StudentPage({ studentId }) {
  const [therapists,        setTherapists]        = useState([]);
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [availability,      setAvailability]      = useState([]);
  const [appointments,      setAppointments]      = useState([]);
  const [view,              setView]              = useState(Views.MONTH);
  const [date,              setDate]              = useState(new Date());
  const [clock,             setClock]             = useState(new Date());
  const [slotToBook,        setSlotToBook]        = useState(null);

  // Modal for appointment info
  const [modalOpen,         setModalOpen]         = useState(false);
  const [modalAppt,         setModalAppt]         = useState(null);

  const [customDate,  setCustomDate]  = useState('');
  const [customStart, setCustomStart] = useState('');
  const [customEnd,   setCustomEnd]   = useState('');

  // Poll for updates every 10 seconds (optional but recommended for multi-user sync)
  useEffect(() => {
    const fetchAll = () => {
      axios.get('/api/therapists')
        .then(res => setTherapists(res.data))
        .catch(() => {});
      refreshAppointments();
    };
    fetchAll();
    const interval = setInterval(refreshAppointments, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [studentId]);

  useEffect(() => {
    if (!selectedTherapist) {
      setAvailability([]);
      return;
    }
    axios
      .get(`/api/availability?therapist_id=${selectedTherapist.id}`)
      .then((res) =>
        setAvailability(
          res.data.map((s) => ({
            ...s,
            title: 'Available',
            isAvail: true,
            start: new Date(
              s.start ?? `${s.date}T${s.start_time}`
            ),
            end: new Date(
              s.end ?? `${s.date}T${s.end_time}`
            ),
          }))
        )
      )
      .catch(() => alert('Could not load availability.'));
  }, [selectedTherapist]);

  const refreshAppointments = () =>
    axios
      .get(`/api/appointments?student_id=${studentId}`)
      .then((res) =>
        setAppointments(
          res.data
            .filter(a => a.status !== 'cancelled' && a.status !== 'declined')
            .map((a) => ({
              ...a,
              title: a.status === 'pending' ? '⏳ Pending' : '✅ Booked',
              start: new Date(a.start),
              end:   new Date(a.end),
            }))
        )
      )
      .catch(console.error);

  const bookSlot = () => {
    if (!slotToBook || !selectedTherapist) {
      return alert('Pick a therapist and a slot first.');
    }
    axios
      .post('/api/appointments', {
        student_id:   studentId,
        therapist_id: selectedTherapist.id,
        start: slotToBook.start.toISOString(),
        end:   slotToBook.end.toISOString(),
      })
      .then(() => {
        alert('✅ Appointment requested');
        setSlotToBook(null);
        refreshAppointments();
      })
      .catch(() => alert('Could not book appointment.'));
  };

  const bookCustom = () => {
    if (!selectedTherapist || !customDate || !customStart || !customEnd) {
      return alert('Fill date & time, and choose a therapist.');
    }
    if (customStart >= customEnd)
      return alert('Start time must be before end time.');

    const startISO = `${customDate}T${customStart}`;
    const endISO   = `${customDate}T${customEnd}`;

    axios
      .post('/api/appointments', {
        student_id:   studentId,
        therapist_id: selectedTherapist.id,
        start: startISO,
        end:   endISO,
      })
      .then(() => {
        alert('✅ Appointment requested');
        setCustomDate(''); setCustomStart(''); setCustomEnd('');
        refreshAppointments();
      })
      .catch(() => alert('Could not book appointment.'));
  };

  const cancel = (id) =>
    axios
      .put(`/api/appointments/${id}`, { status: 'cancelled' })
      .then(() => {
        refreshAppointments();
        closeModal();
      });

  // Handle calendar event selection (booking or show modal)
  const handleSelectEvent = (evt) => {
    if (evt.isAvail) {
      setSlotToBook(evt);
    } else {
      setModalAppt(evt);
      setModalOpen(true);
      setSlotToBook(null);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalAppt(null);
  };

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={styles.pageWrapper}>
      <main style={styles.mainContent}>
        <h2 style={styles.heading}>Student Dashboard</h2>
        <div style={styles.timestamp}>
          {format(clock, 'EEEE, MMMM d, yyyy - hh:mm:ss a')}
        </div>

        {/* Therapist picker */}
        <section style={styles.card}>
          <h3 style={styles.sectionTitle}>👩‍⚕️ Choose Therapist</h3>
          <select
            value={selectedTherapist?.id || ''}
            onChange={(e) => {
              const t = therapists.find((th) => th.id === +e.target.value);
              setSelectedTherapist(t || null);
              setSlotToBook(null);
            }}
            style={styles.select}
          >
            <option value="">-- pick one --</option>
            {therapists.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.specialties?.length ? ` (${t.specialties.join(', ')})` : ''}
              </option>
            ))}
          </select>
        </section>

        {/* Calendar */}
        <section style={styles.card}>
          <h3 style={styles.sectionTitle}>📅 Available Slots & Your Bookings</h3>
          <Calendar
            localizer={localizer}
            events={[...availability, ...appointments]}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 400 }}
            selectable
            view={view}
            date={date}
            onView={setView}
            onNavigate={setDate}
            onSelectSlot={() => setSlotToBook(null)}
            onSelectEvent={handleSelectEvent}
            views={[Views.MONTH, Views.WEEK, Views.DAY]}
          />
          {slotToBook && (
            <p style={{ marginTop: 8 }}>
              Selected:&nbsp;
              <strong>
                {format(slotToBook.start, 'MMM d, hh:mm a')} –{' '}
                {format(slotToBook.end, 'hh:mm a')}
              </strong>
            </p>
          )}
          <button
            onClick={bookSlot}
            style={{ ...styles.acceptBtn, marginTop: 8 }}
            disabled={!slotToBook}
          >
            Book This Available Slot
          </button>
        </section>

        {/* Modal for appointment details/cancel */}
        {modalOpen && modalAppt && (
          <div style={styles.modalOverlay} onClick={closeModal}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
              <h3 style={{ color: PURPLE, marginBottom: 12 }}>Appointment Details</h3>
              <div><b>Time:</b> {format(modalAppt.start, 'MMM d, yyyy, hh:mm a')} – {format(modalAppt.end, 'hh:mm a')}</div>
              <div><b>Status:</b> {modalAppt.status}</div>
              <div style={{ marginTop: 20 }}>
                {['pending', 'accepted'].includes(modalAppt.status) && (
                  <button onClick={() => { cancel(modalAppt.id); }} style={styles.declineBtn}>Cancel Appointment</button>
                )}
                <button onClick={closeModal} style={styles.acceptBtn}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Custom request */}
        <section style={styles.card}>
          <h3 style={styles.sectionTitle}>📝 Request Custom Time</h3>
          <div style={styles.formRow}>
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              style={styles.input}
            />
            <input
              type="time"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              style={styles.input}
            />
            <span>to</span>
            <input
              type="time"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              style={styles.input}
            />
            <button onClick={bookCustom} style={styles.acceptBtn}>
              Request
            </button>
          </div>
        </section>

        {/* Requests */}
        <section style={styles.card}>
          <h3 style={styles.sectionTitle}>📬 Your Requests</h3>
          {appointments.length === 0 ? (
            <p style={styles.emptyText}>No appointments yet</p>
          ) : (
            appointments.map((req) => (
              <div key={req.id} style={styles.requestBox}>
                <div>
                  <strong>{req.therapist_name}</strong>
                  <br />
                  {format(req.start, 'MMM d, hh:mm a')} –{' '}
                  {format(req.end, 'hh:mm a')} <br />
                  <em>Status: {req.status}</em>
                </div>
                {req.status === 'pending' && (
                  <button
                    onClick={() => cancel(req.id)}
                    style={styles.declineBtn}
                  >
                    Cancel
                  </button>
                )}
              </div>
            ))
          )}
        </section>

        <Link to="/">
          <button style={styles.homeBtn}>🏠 Back to Home</button>
        </Link>
      </main>
    </div>
  );
}

const styles = {
  pageWrapper: {
    fontFamily: 'Inter, sans-serif',
    backgroundColor: '#f9f9fb',
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
    marginBottom: '0.5rem',
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
  select: {
    padding: '0.5rem',
    borderRadius: 6,
    border: `1px solid ${PURPLE}`,
    width: '100%',
  },
  input: {
    flex: '1 1 120px',
    padding: '0.4rem',
    borderRadius: 6,
    border: `1px solid ${PURPLE}`,
  },
  formRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    alignItems: 'center',
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
    backgroundColor: LIGHT_BG,
    borderLeft: `4px solid ${PURPLE}`,
    padding: '1rem',
    marginBottom: 12,
    borderRadius: 8,
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