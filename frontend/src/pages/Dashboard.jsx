import React from "react";

const styles = {
  card: {
    background: "#fff",
    padding: "16px",
    borderRadius: "12px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
    marginBottom: "20px",
  },
  header: {
    background: "#4f46e5",
    color: "#fff",
    padding: "16px",
    borderRadius: "12px",
    marginBottom: "24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    boxSizing: "border-box",
  },
  button: {
    background: "#4f46e5",
    color: "#fff",
    border: "none",
    padding: "10px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    marginTop: "10px",
  },
  cancelButton: {
    background: "#e5e7eb",
    color: "#000",
    border: "none",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    marginTop: "8px",
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "20px",
    width: "100%",
  },
  calendarGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "4px",
    textAlign: "center",
  },
  calendarCell: (isSelected) => ({
    padding: "8px",
    borderRadius: "50%",
    backgroundColor: isSelected ? "#4f46e5" : "transparent",
    color: isSelected ? "#fff" : "#000",
    cursor: "pointer",
  }),
};

const Dashboard = () => {
  return (
    <div
      style={{
        padding: "24px",
        backgroundColor: "#f3f4f6",
        minHeight: "100vh",
        width: "100vw",
        boxSizing: "border-box",
      }}
    >
      <header style={styles.header}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold" }}>Therapy Scheduler</h1>
        <div>
          <button style={{ marginRight: "10px", ...styles.button }}>Dashboard</button>
          <button style={styles.button}>Logout</button>
        </div>
      </header>

      <div style={styles.layout}>
        <div style={styles.card}>
          <h2>Upcoming Appointment</h2>
          <p>Anxiety Therapy</p>
          <p>April 25, 2024, 10:00am – 11:00am</p>
          <button style={styles.cancelButton}>Cancel</button>
        </div>

        <div style={styles.card}>
          <h2>Availability</h2>
          <button style={styles.button}>Set Availability</button>
        </div>

        <div style={styles.card}>
          <h2>Accept Appointment</h2>
          <select style={{ width: "100%", padding: "8px", marginBottom: "10px" }}>
            <option>Select an appointment</option>
          </select>
          <button style={styles.button}>Accept</button>
        </div>

        <div style={styles.card}>
          <h2>Session History</h2>
          <ul>
            <li>Depression Therapy — April 18, 2024</li>
            <li>ADHD Therapy — April 10, 2024</li>
          </ul>
        </div>

        <div style={styles.card}>
          <h2>Calendar</h2>
          <p style={{ fontWeight: "bold" }}>April 2024</p>
          <div style={styles.calendarGrid}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} style={{ fontWeight: "bold" }}>{d}</div>
            ))}
            {Array.from({ length: 30 }, (_, i) => (
              <div
                key={i}
                style={styles.calendarCell(i + 1 === 23)}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
