// Stylish Therapist Dashboard (Updated with Manual Availability)
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Views, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

export default function TherapistPage() {
  const [availability, setAvailability] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([
    { id: 101, student: 'John Smith', date: 'May 20, 2025', time: '2:00 PM - 2:45 PM' },
  ]);
  const [view, setView] = useState(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [manualSlot, setManualSlot] = useState({ start: '', end: '' });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSelectSlot = ({ start, end }) => {
    
    
    const formattedStart = format(start, 'hh:mm a');
    const formattedEnd = format(end, 'hh:mm a');
    const newEvent = {
      title: `Available from ${formattedStart} to ${formattedEnd}`,
      start,
      end,
    };
    setAvailability([...availability, newEvent]);
  };

  const handleAddManualSlot = (e) => {
    e.preventDefault();
    const start = new Date(manualSlot.start);
    const end = new Date(manualSlot.end);
    if (start >= end) return alert("End must be after start.");
    setAvailability([...availability, {
      title: `Available from ${format(start, 'hh:mm a')} to ${format(end, 'hh:mm a')}`,
      start,
      end,
    }]);
    setManualSlot({ start: '', end: '' });
  };

  const handleDeleteEvent = (eventToDelete) => {
    const updatedEvents = availability.filter(
      (event) => event.start !== eventToDelete.start || event.end !== eventToDelete.end
    );
    setAvailability(updatedEvents);
  };

  const handleRequestAction = (id, accepted) => {
    setPendingRequests(prev => prev.filter(req => req.id !== id));
    if (accepted) alert(`✅ Accepted booking #${id}`);
    else alert(`❌ Declined booking #${id}`);
  };

  const handleViewChange = (newView) => setView(newView);
  const handleNavigate = (newDate) => setDate(newDate);

  return (
    <div style={styles.pageWrapper}>
      <main style={styles.mainContent}>
        <h2 style={styles.heading}>Therapist Dashboard</h2>
        <div style={styles.timestamp}>{format(currentTime, 'EEEE, MMMM d, yyyy - hh:mm:ss a')}</div>
        <p style={styles.subtext}>Welcome to your therapist page. Manage availability and bookings.</p>

        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>📬 Pending Bookings</h3>
          {pendingRequests.length === 0 ? (
            <p style={styles.emptyText}>No requests</p>
          ) : (
            pendingRequests.map(req => (
              <div key={req.id} style={styles.requestBox}>
                <div>
                  <strong>{req.student}</strong><br />{req.date}, {req.time}
                </div>
                <div>
                  <button onClick={() => handleRequestAction(req.id, true)} style={styles.acceptBtn}>Accept</button>
                  <button onClick={() => handleRequestAction(req.id, false)} style={styles.declineBtn}>Decline</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>➕ Manually Add Availability</h3>
          <form onSubmit={handleAddManualSlot}>
            <input type="datetime-local"  value={manualSlot.start} onChange={(e) => setManualSlot({ ...manualSlot, start: e.target.value })} style={styles.selectView} required />
            <input type="datetime-local" value={manualSlot.end} onChange={(e) => setManualSlot({ ...manualSlot, end: e.target.value })} style={styles.selectView} required />
            <button type="submit" style={{ ...styles.acceptBtn, marginTop: '10px' }}>Add Slot</button>
          </form>
        </div>

        <div style={styles.controls}>
          <button onClick={() => handleNavigate(new Date(date.setMonth(date.getMonth() - 1)))} style={styles.navBtn}>← Previous</button>
          <button onClick={() => handleNavigate(new Date())} style={styles.navBtn}>Today</button>
          <button onClick={() => handleNavigate(new Date(date.setMonth(date.getMonth() + 1)))} style={styles.navBtn}>Next →</button>
          <select onChange={(e) => handleViewChange(e.target.value)} value={view} style={styles.selectView}>
            <option value={Views.MONTH}>Month</option>
            <option value={Views.WEEK}>Week</option>
            <option value={Views.DAY}>Day</option>
            <option value={Views.AGENDA}>Agenda</option>
          </select>
        </div>

        <div style={styles.calendarWrap}>
          <Calendar
            localizer={localizer}
            events={appointments.concat(availability)}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 500 }}
            selectable
            view={view}
            date={date}
            onView={handleViewChange}
            onNavigate={handleNavigate}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={(event) => {
              if (window.confirm('Delete this time slot?')) handleDeleteEvent(event);
            }}
            views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
          />
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
    fontFamily: 'Segoe UI, sans-serif',
    backgroundColor: '#f5f6fa',
    minHeight: '100vh',
    paddingBottom: '3rem'
  },
  mainContent: {
    maxWidth: 1000,
    margin: '30px auto',
    padding: '0 20px',
    textAlign: 'center'
  },
  heading: {
    fontSize: '2.5rem',
    marginBottom: '0.25rem',
    color: '#4c51bf',
    fontFamily: 'Poppins, sans-serif',
    fontWeight: '700',
    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.1)'
  },
  timestamp: {
    fontSize: '1.2rem',
    fontWeight: '600',
    fontFamily: 'Courier New, monospace',
    color: '#4a5568',
    margin: '1rem auto',
    backgroundColor: '#edf2f7',
    padding: '0.75rem 1.5rem',
    borderRadius: '10px',
    display: 'inline-block',
    boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
  },
  subtext: {
    marginBottom: '2rem',
    color: '#666'
  },
  sectionTitle: {
    color: '#6b46c1',
    fontSize: '1.25rem',
    marginBottom: '1rem'
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    marginBottom: '2rem'
  },
  requestBox: {
    backgroundColor: '#f1f1ff',
    borderLeft: '4px solid #805ad5',
    padding: '1rem',
    marginBottom: '1rem',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  acceptBtn: {
    backgroundColor: '#38a169',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '5px',
    marginRight: '0.5rem',
    cursor: 'pointer'
  },
  declineBtn: {
    backgroundColor: '#e53e3e',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '5px',
    cursor: 'pointer'
  },
  controls: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem'
  },
  navBtn: {
    backgroundColor: '#6b46c1',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  selectView: {
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    border: '1px solid #ccc',
    margin: '0.5rem'
  },
  calendarWrap: {
    backgroundColor: '#ffffff',
    padding: '1rem',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    marginBottom: '2rem'
  },
  homeBtn: {
    backgroundColor: '#6b46c1',
    color: 'white',
    border: 'none',
    padding: '0.75rem 2rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  emptyText: {
    color: '#888'
  }
};
