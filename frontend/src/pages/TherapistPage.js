import React, { useState, useEffect } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { enUS } from 'date-fns/locale';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

function TherapistPage() {
  const [availability, setAvailability] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [newSlot, setNewSlot] = useState({ start: '', end: '' });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [calendarView, setCalendarView] = useState(Views.WEEK);
  const [calendarDate, setCalendarDate] = useState(new Date());

  useEffect(() => {
    setAppointments([
      { id: 1, title: 'Jane Doe - Anxiety Therapy', start: new Date(2025, 4, 15, 10, 0), end: new Date(2025, 4, 15, 11, 0) }
    ]);
    setPendingRequests([
      { id: 101, student: 'John Smith', date: 'May 20, 2025', time: '2:00 PM - 2:45 PM' },
    ]);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAddSlot = (e) => {
    e.preventDefault();
    const slot = {
      title: 'Available Slot',
      start: new Date(newSlot.start),
      end: new Date(newSlot.end),
    };
    setAvailability([...availability, slot]);
    setNewSlot({ start: '', end: '' });
  };

  const handleRequestAction = (id, accepted) => {
    setPendingRequests(prev => prev.filter(req => req.id !== id));
    if (accepted) alert(`Accepted booking #${id}`);
    else alert(`Declined booking #${id}`);
  };

  return (
    <div style={styles.wrapper}>
      <header style={styles.header}>
        <h1 style={styles.title}>Therapist Dashboard</h1>
        <div style={styles.clock}>{format(currentTime, 'EEEE, MMMM d, yyyy - hh:mm:ss a')}</div>
        <nav style={styles.nav}>
          <a href="#" style={styles.navLink}>Home</a>
          <a href="#" style={styles.navLink}>Logout</a>
        </nav>
      </header>

      <h2 style={styles.pageTitle}>Welcome Back</h2>
      <p style={styles.subtitle}>Manage your sessions, availability, and requests</p>

      <div style={styles.cardContainer}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Add Availability</h3>
          <form onSubmit={handleAddSlot}>
            <label style={styles.label}>Start Time</label>
            <input type="datetime-local" step="900" value={newSlot.start} onChange={(e) => setNewSlot({ ...newSlot, start: e.target.value })} style={styles.input} required />
            <label style={styles.label}>End Time</label>
            <input type="datetime-local" step="900" value={newSlot.end} onChange={(e) => setNewSlot({ ...newSlot, end: e.target.value })} style={styles.input} required />
            <button type="submit" style={styles.primaryBtn}>Add Slot</button>
          </form>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Pending Bookings</h3>
          {pendingRequests.length === 0 ? <p>No requests</p> : pendingRequests.map(req => (
            <div key={req.id} style={styles.requestBox}>
              <p><strong>{req.student}</strong><br />{req.date}, {req.time}</p>
              <div>
                <button onClick={() => handleRequestAction(req.id, true)} style={styles.acceptBtn}>Accept</button>
                <button onClick={() => handleRequestAction(req.id, false)} style={styles.declineBtn}>Decline</button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ ...styles.card, gridColumn: '1 / -1' }}>
          <h3 style={styles.cardTitle}>My Appointments</h3>
          <BigCalendar
            localizer={localizer}
            events={appointments.concat(availability)}
            startAccessor="start"
            endAccessor="end"
            step={15}
            timeslots={1}
            views={['month', 'week', 'day', 'agenda']}
            view={calendarView}
            date={calendarDate}
            onView={(view) => setCalendarView(view)}
            onNavigate={(date) => setCalendarDate(date)}
            style={{ height: 600 }}
          />
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: { fontFamily: 'Segoe UI, sans-serif', backgroundColor: '#f5f6fa', minHeight: '100vh', paddingBottom: '3rem' },
  header: { background: 'linear-gradient(to right, #6b46c1, #805ad5)', color: 'white', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: '1.5rem', margin: 0 },
  clock: { fontSize: '1rem', fontWeight: 'bold', fontStyle: 'italic', backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '0.5rem 1rem', borderRadius: '8px' },
  nav: { display: 'flex', gap: '1rem' },
  navLink: { color: 'white', textDecoration: 'none', fontWeight: 'bold' },
  pageTitle: { textAlign: 'center', fontSize: '2rem', margin: '2rem 0 0.5rem', color: '#222' },
  subtitle: { textAlign: 'center', color: '#555', marginBottom: '2rem' },
  cardContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', padding: '0 2rem' },
  card: { background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
  cardTitle: { color: '#6b46c1', marginBottom: '1rem' },
  label: { display: 'block', marginTop: '1rem', fontWeight: 'bold', color: '#333' },
  input: { width: '100%', padding: '0.75rem', marginTop: '0.5rem', marginBottom: '1rem', border: '1px solid #ccc', borderRadius: '6px', fontSize: '1rem' },
  primaryBtn: { backgroundColor: '#6b46c1', color: 'white', padding: '0.5rem 1rem', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  requestBox: { backgroundColor: '#f9f9f9', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', borderLeft: '4px solid #6b46c1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  acceptBtn: { backgroundColor: '#38a169', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '5px', marginRight: '0.5rem', cursor: 'pointer' },
  declineBtn: { backgroundColor: '#e53e3e', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '5px', cursor: 'pointer' },
};

export default TherapistPage;
