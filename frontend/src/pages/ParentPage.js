// ParentPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Views, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import axios from 'axios';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });
const PURPLE = '#805ad5';

export default function ParentPage({ parentId }) {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [newChildEmail, setNewChildEmail] = useState('');
  const [therapists, setTherapists] = useState([]);
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [view, setView] = useState(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [slotToBook, setSlotToBook] = useState(null);

  useEffect(() => {
    // clock
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // load your children, therapists, and your current appointments
    axios.get(`/api/parents/${parentId}/students`)
      .then(res => setChildren(res.data))
      .catch(console.error);

    axios.get('/api/therapists')
      .then(res => setTherapists(res.data))
      .catch(console.error);

    fetchAppointments();
  }, []);

  useEffect(() => {
    // load availability when therapist selected
    if (selectedTherapist) {
      axios.get(`/api/availability?therapist_id=${selectedTherapist.id}`)
        .then(res => setAvailability(res.data))
        .catch(console.error);
    } else {
      setAvailability([]);
    }
  }, [selectedTherapist]);

  function fetchAppointments() {
    axios.get(`/api/appointments?parent_id=${parentId}`)
      .then(res => setAppointments(res.data))
      .catch(console.error);
  }

  function handleAddChild(e) {
    e.preventDefault();
    axios.post(`/api/parents/${parentId}/students`, { email: newChildEmail })
      .then(res => {
        setChildren([...children, res.data]);
        setNewChildEmail('');
      })
      .catch(err => {
        console.error(err);
        alert('❌ Could not add child.');
      });
  }

  function handleSelectSlot(slot) {
    setSlotToBook(slot);
  }

  function handleBookAppointment() {
    if (!selectedChild || !selectedTherapist || !slotToBook) {
      return alert('Select a child, a therapist, and a slot first.');
    }
    axios.post('/api/appointments', {
      parent_id: parentId,
      student_id: selectedChild.id,
      therapist_id: selectedTherapist.id,
      start: slotToBook.start.toISOString(),
      end: slotToBook.end.toISOString(),
      status: 'pending'
    })
    .then(() => {
      alert('✅ Appointment requested');
      setSlotToBook(null);
      fetchAppointments();
    })
    .catch(err => {
      console.error(err);
      alert('❌ Could not book appointment.');
    });
  }

  function handleCancel(id) {
    axios.put(`/api/appointments/${id}`, { status: 'cancelled' })
      .then(fetchAppointments)
      .catch(console.error);
  }

  return (
    <div style={styles.pageWrapper}>
      <main style={styles.mainContent}>
        <h2 style={styles.heading}>Parent Dashboard</h2>
        <div style={styles.timestamp}>
          {format(currentTime, 'EEEE, MMMM d, yyyy - hh:mm:ss a')}
        </div>
        <p style={styles.subtext}>
          Manage your children and book their sessions.
        </p>

        {/* Your Children */}
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>👶 Your Children</h3>
          <form onSubmit={handleAddChild} style={styles.formRow}>
            <input
              type="email"
              placeholder="Child's email"
              value={newChildEmail}
              onChange={e => setNewChildEmail(e.target.value)}
              style={styles.input}
              required
            />
            <button type="submit" style={styles.acceptBtn}>Add Child</button>
          </form>
          {children.map(child => (
            <div
              key={child.id}
              onClick={() => setSelectedChild(child)}
              style={{
                ...styles.requestBox,
                borderLeft: `4px solid ${selectedChild?.id === child.id ? '#38a169' : PURPLE}`
              }}
            >
              {child.name} — {child.email}
            </div>
          ))}
        </div>

        {/* Choose Therapist */}
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>👩‍⚕️ Choose Therapist</h3>
          <select
            value={selectedTherapist?.id || ''}
            onChange={e => {
              const t = therapists.find(t => t.id === +e.target.value);
              setSelectedTherapist(t || null);
            }}
            style={styles.select}
          >
            <option value="">-- pick one --</option>
            {therapists.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.specialty})
              </option>
            ))}
          </select>
        </div>

        {/* Calendar */}
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>📅 Available Slots & Your Bookings</h3>
          <Calendar
            localizer={localizer}
            events={[
              ...availability.map(a => ({ ...a, title: 'Available', isAvail: true })),
              ...appointments.map(a => ({
                ...a,
                title: a.status === 'pending' ? '⏳ Pending' : '✅ Booked'
              }))
            ]}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 400 }}
            selectable
            view={view}
            date={date}
            onView={setView}
            onNavigate={setDate}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={evt => {
              if (evt.isAvail) setSlotToBook(evt);
            }}
            views={[Views.MONTH, Views.WEEK, Views.DAY]}
          />
          <button
            onClick={handleBookAppointment}
            style={{ ...styles.acceptBtn, marginTop: 8 }}
            disabled={!slotToBook}
          >
            Book This Slot
          </button>
        </div>

        {/* Your Requests */}
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>📬 Your Requests</h3>
          {appointments.length === 0 ? (
            <p style={styles.emptyText}>No appointments yet</p>
          ) : appointments.map(req => (
            <div key={req.id} style={styles.requestBox}>
              <div>
                <strong>{req.student_name}</strong><br />
                {format(new Date(req.start), 'MMM d, hh:mm a')} –{' '}
                {format(new Date(req.end), 'hh:mm a')}<br />
                <em>Status: {req.status}</em>
              </div>
              {req.status === 'pending' && (
                <button
                  onClick={() => handleCancel(req.id)}
                  style={styles.declineBtn}
                >
                  Cancel
                </button>
              )}
            </div>
          ))}
        </div>

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
    paddingBottom: 40
  },
  mainContent: {
    maxWidth: 960,
    margin: '40px auto',
    padding: '0 20px',
    textAlign: 'center'
  },
  heading: {
    fontSize: '2.25rem',
    marginBottom: '0.5rem',
    color: PURPLE,
    fontWeight: 700
  },
  timestamp: {
    fontSize: '1rem',
    fontFamily: 'Courier New, monospace',
    color: '#3c3a4f',
    marginBottom: '1.5rem',
    backgroundColor: '#eef2ff',
    padding: '0.5rem 1rem',
    borderRadius: 8,
    display: 'inline-block'
  },
  subtext: { marginBottom: '2rem', color: '#555' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: '1.5rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    marginBottom: '2rem',
    textAlign: 'left'
  },
  sectionTitle: { color: PURPLE, fontSize: '1.3rem', marginBottom: '1rem', fontWeight: 600 },
  formRow: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  input: {
    flex: '1 1 200px',
    padding: '0.5rem',
    borderRadius: 6,
    border: `1px solid ${PURPLE}`
  },
  select: {
    padding: '0.5rem',
    borderRadius: 6,
    border: `1px solid ${PURPLE}`,
    width: '100%'
  },
  acceptBtn: {
    backgroundColor: PURPLE,
    color: '#fff',
    border: 'none',
    padding: '0.6rem 1.2rem',
    borderRadius: 8,
    fontWeight: 600,
    cursor: 'pointer'
  },
  declineBtn: {
    backgroundColor: '#e53e3e',
    color: '#fff',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: 8,
    cursor: 'pointer'
  },
  requestBox: {
    backgroundColor: '#faf5ff',
    borderLeft: `4px solid ${PURPLE}`,
    padding: '1rem',
    marginBottom: '1rem',
    borderRadius: 8,
    cursor: 'pointer'
  },
  emptyText: { color: '#888', fontStyle: 'italic' },
  homeBtn: {
    backgroundColor: PURPLE,
    color: '#fff',
    border: 'none',
    padding: '0.75rem 2rem',
    borderRadius: 8,
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer'
  }
};