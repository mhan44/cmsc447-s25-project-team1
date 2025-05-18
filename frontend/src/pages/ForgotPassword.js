import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import '../styles/AuthPage.css'; // same CSS used by LoginPage

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('student');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/forgot-password', { email, role });
      setMessage('Reset link sent to your email.');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Something went wrong.');
    }
  };

  return (
    <div className="auth-container">
      <h2>Forgot Password</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="role">Role</label>
        <select
          id="role"
          value={role}
          onChange={e => setRole(e.target.value)}
        >
          <option value="student">Student</option>
          <option value="parent">Parent</option>
          <option value="therapist">Therapist</option>
        </select>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />

        <button type="submit">Send Reset Link</button>
      </form>

      {message && <p className="form-message">{message}</p>}

      <div className="toggle-link">
        <Link to="/login">Return to login</Link>
      </div>
    </div>
  );
};

export default ForgotPassword;
