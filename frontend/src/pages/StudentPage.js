// src/pages/StudentPage.js
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
const LIGHT_BG = '#faf5ff';

export default function StudentPage({ studentId }) {
  const [therapists, setTherapists] = useState([]);
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [view, setView] = useState(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [slotToBook, setSlotToBook] = useState(null);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load therapists and appointments on mount
  useEffect(() => {
    async function loadInitial() {
      try {
        const [tRes, aRes] = await Promise.all([
          axios.get('/api/therapists'),
          axios.get(`/api/appointments?student_id=${studentId}`)
        ]);
        setTherapists(tRes.data);
        setAppointments(
          aRes.data.map(a => ({
            id: a.appointment_id,
            start: new Date(`${a.date}T${a.time}`),
            end:   new Date(`${a.date}T${a.time}`), // if you have separate end_time, adjust here
            status: a.status,
            therapist_name: a.therapist_name
          }))
        );
      } catch (err) {
        console.error('Initial load error:', err);
        alert('Could not load data. Check your backend routes.');
      }
    }
    loadInitial();
  }, [studentId]);

  // Load availability for selected therapist
  useEffect(() => {
    if (!selectedTherapist) {
      setAvailability([]);
      return;
    }
    axios
      .get(`/api/availability?therapist_id=${selectedTherapist.id}`)
      .then(res => {
        setAvailability(
          res.data.map(slot => ({
            id: slot.availability_id,
            start: new Date(slot.start_time),
            end:   new Date(slot.end_time)
          }))
        );
      })
      .catch(err => {
        console.error('Availability load error:', err);
        alert('Could not load availability.');
      });
  }, [selectedTherapist]);

  // Refresh appointments
  function fetchAppointments() {
    axios
      .get(`/api/appointments?student_id=${studentId}`)
      .then(res => {
        setAppointments(
          res.data.map(a => ({
            id: a.appointment_id,
            start: new Date(`${a.date}T${a.time}`),
            end:   new Date(`${a.date}T${a.time}`),
            status: a.status,
            therapist_name: a.therapist_name
          }))
        );
      })
      .catch(err => {
        console.error('Fetch appointments error:', err);
        alert('Could not load appointments.');
      });
  }

  // When user selects a slot on calendar
  function handleSelectSlot(slotInfo) {
    if (slotInfo && slotInfo.start && slotInfo.end) {
      setSlotToBook(slotInfo);
    }
  }

  // Book the selected slot
  function handleBook() {
    if (!selectedTherapist || !slotToBook) {
      alert('Please select a therapist and a time slot.');
      return;
    }
    axios
      .post('/api/appointments', {
        student_id: studentId,
        therapist_id: selectedTherapist.id,
        date: slotToBook.start.toISOString().slice(0, 10),
        time: slotToBook.start.toISOString().slice(11, 16),
        status: 'pending'
      })
      .then(() => {
        alert('✅ Appointment requested');
        setSlotToBook(null);
        fetchAppointments();
      })
      .catch(err => {
        console.error('Booking error:', err);
        alert('Could not book appointment.');
      });
  }

  // Cancel a pending appointment
  function handleCancel(id) {
    axios
      .put(`/api/appointments/${id}`, { status: 'cancelled' })
      .then(fetchAppointments)
      .catch(err => {
        console.error('Cancel error:', err);
        alert('Could not cancel appointment.');
      });
  }

  return (
    <div style={styles.pageWrapper}>
      <main style={styles.mainContent}>
        <h2 style={styles.heading}>Student Dashboard</h2>
        <div style={styles.timestamp}>
          {format(currentTime, 'EEEE, MMMM d, yyyy - hh:mm:ss a')}
        </div>
        <p style={styles.subtext}>
          Manage your sessions and book time with your therapist.
        </p>

        {/* Therapist Picker */}
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>👩‍⚕️ Choose Therapist</h3>
          <select
            value={selectedTherapist?.id || ''}
            onChange={e => {
              const sel = therapists.find(t => t.id === +e.target.value) || null;
              setSelectedTherapist(sel);
            }}
            style={styles.select}
          >
            <option value="">-- pick one --</option>
            {therapists.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.specialties && t.specialties.length
                  ? ` (${t.specialties.join(', ')})`
                  : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Calendar (Availability + Your Appointments) */}
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
            onSelectEvent={evt => evt.isAvail && setSlotToBook(evt)}
            views={[Views.MONTH, Views.WEEK, Views.DAY]}
          />
          <button
            onClick={handleBook}
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
          ) : (
            appointments.map(req => (
              <div key={req.id} style={styles.requestBox}>
                <div>
                  <strong>{req.therapist_name}</strong><br />
                  {format(req.start, 'MMM d, hh:mm a')} –{' '}
                  {format(req.end, 'hh:mm a')}<br />
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
            ))
          )}
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
  subtext: {
    marginBottom: '2rem',
    color: '#555'
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: '1.5rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    marginBottom: '2rem',
    textAlign: 'left'
  },
  sectionTitle: {
    color: PURPLE,
    fontSize: '1.3rem',
    marginBottom: '1rem',
    fontWeight: 600
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
    backgroundColor: LIGHT_BG,
    borderLeft: `4px solid ${PURPLE}`,
    padding: '1rem',
    marginBottom: '1rem',
    borderRadius: 8
  },
  emptyText: {
    color: '#888',
    fontStyle: 'italic'
  },
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