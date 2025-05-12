import React, { useState, useEffect } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, isBefore } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { enUS } from 'date-fns/locale';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

function roundToNearest15(date) {
  const ms = 1000 * 60 * 15;
  return new Date(Math.round(date.getTime() / ms) * ms);
}

function ParentPage() {
  const [children, setChildren] = useState([]);
  const [events, setEvents] = useState([]);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [formData, setFormData] = useState({ name: '', age: '' });
  const [newEvent, setNewEvent] = useState({ title: '', start: '', end: '' });

  useEffect(() => {
    setChildren([{ id: 1, name: 'Jane Doe', age: 15 }]);
    setEvents([
      {
        title: 'Anxiety Therapy',
        start: new Date(2025, 4, 14, 10, 0),
        end: new Date(2025, 4, 14, 11, 0),
      },
    ]);
    setSessionHistory([
      { title: 'Depression Therapy', date: 'May 5, 2025' },
      { title: 'ADHD Therapy', date: 'May 1, 2025' },
    ]);
  }, []);

  const handleAddChild = (e) => {
    e.preventDefault();
    const id = Date.now();
    setChildren([...children, { id, ...formData }]);
    setFormData({ name: '', age: '' });
  };

  const handleAddEvent = (e) => {
    e.preventDefault();
    const rawStart = new Date(newEvent.start);
    const rawEnd = new Date(newEvent.end);

    const roundedStart = roundToNearest15(rawStart);
    const roundedEnd = roundToNearest15(rawEnd);

    const now = new Date();

    // If end time is in the past, add to session history
    if (isBefore(roundedEnd, now)) {
      setSessionHistory(prev => [
        ...prev,
        {
          title: newEvent.title,
          date: roundedStart.toDateString(),
        },
      ]);
    } else {
      setEvents([
        ...events,
        {
          title: newEvent.title,
          start: roundedStart,
          end: roundedEnd,
        },
      ]);
    }

    setNewEvent({ title: '', start: '', end: '' });
  };

  return (
    <div style={styles.wrapper}>
      <header style={styles.header}>
        <h1 style={styles.title}>Therapy Scheduler</h1>
        <nav style={styles.nav}>
          <a href="#" style={styles.navLink}>Dashboard</a>
          <a href="#" style={styles.navLink}>Logout</a>
        </nav>
      </header>

      <h2 style={styles.pageTitle}>Parent Dashboard</h2>
      <p style={styles.subtitle}>Manage children, view sessions, and book appointments</p>

      <div style={styles.cardContainer}>
        {/* Add Child */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Add New Child</h3>
          <form onSubmit={handleAddChild}>
            <label style={styles.label}>Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={styles.input}
              required
            />
            <label style={styles.label}>Age</label>
            <input
              type="number"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              style={styles.input}
              required
            />
            <button type="submit" style={styles.primaryBtn}>Add Child</button>
          </form>
        </div>

        {/* Children List */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Children</h3>
          {children.map(child => (
            <div key={child.id} style={styles.childBox}>
              <strong>{child.name}</strong><br />Age: {child.age}
            </div>
          ))}
        </div>

        {/* Session History */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Session History</h3>
          {sessionHistory.length === 0 ? (
            <p>No past sessions yet</p>
          ) : (
            sessionHistory.map((session, i) => (
              <div key={i} style={styles.childBox}>
                <strong>{session.title}</strong><br />
                {session.date}
              </div>
            ))
          )}
        </div>

        {/* Appointment Form */}
        <div style={{ ...styles.card, gridColumn: '1 / -1' }}>
          <h3 style={styles.cardTitle}>Book Appointment</h3>
          <form onSubmit={handleAddEvent}>
            <input
              type="text"
              placeholder="Session Title"
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              style={styles.input}
              required
            />
            <label style={styles.label}>Start Time</label>
            <input
              type="datetime-local"
              step="900"
              value={newEvent.start}
              onChange={(e) => setNewEvent({ ...newEvent, start: e.target.value })}
              style={styles.input}
              required
            />
            <label style={styles.label}>End Time</label>
            <input
              type="datetime-local"
              step="900"
              value={newEvent.end}
              onChange={(e) => setNewEvent({ ...newEvent, end: e.target.value })}
              style={styles.input}
              required
            />
            <button type="submit" style={styles.primaryBtn}>Add Appointment</button>
          </form>
        </div>

        {/* Calendar */}
        <div style={{ ...styles.card, gridColumn: '1 / -1' }}>
          <h3 style={styles.cardTitle}>Appointment Calendar</h3>
          <BigCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            step={15}
            timeslots={1}
            defaultView="week"
            style={{ height: 600 }}
          />
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    fontFamily: 'Segoe UI, sans-serif',
    backgroundColor: '#f5f6fa',
    minHeight: '100vh',
    paddingBottom: '3rem',
  },
  header: {
    background: 'linear-gradient(to right, #6b46c1, #805ad5)',
    color: 'white',
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: '1.5rem', margin: 0 },
  nav: { display: 'flex', gap: '1rem' },
  navLink: {
    color: 'white',
    textDecoration: 'none',
    fontWeight: 'bold',
  },
  pageTitle: {
    textAlign: 'center',
    fontSize: '2rem',
    margin: '2rem 0 0.5rem',
    color: '#222',
  },
  subtitle: {
    textAlign: 'center',
    color: '#555',
    marginBottom: '2rem',
  },
  cardContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem',
    padding: '0 2rem',
  },
  card: {
    background: 'white',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  },
  cardTitle: {
    color: '#6b46c1',
    marginBottom: '1rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    marginTop: '0.5rem',
    marginBottom: '1rem',
    border: '1px solid #ccc',
    borderRadius: '6px',
    fontSize: '1rem',
  },
  primaryBtn: {
    backgroundColor: '#6b46c1',
    color: 'white',
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
    width: '100%',
  },
  childBox: {
    backgroundColor: '#f9f9f9',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '0.75rem',
    borderLeft: '4px solid #6b46c1',
  },
};

export default ParentPage;
