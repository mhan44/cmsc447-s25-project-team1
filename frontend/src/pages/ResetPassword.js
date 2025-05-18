import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import '../styles/AuthPage.css';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [role, setRole] = useState('student');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, token, newPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('Password reset successfully, log in.');
      } else {
        setMessage(data.error || 'Something went wrong.');
      }
    } catch (err) {
      setMessage('Something went wrong.');
    }
  };

  return (
    <div className="auth-container">
      <h2>Reset Password</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="role">Role</label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="student">Student</option>
          <option value="parent">Parent</option>
          <option value="therapist">Therapist</option>
        </select>

        <label htmlFor="newPassword">New Password</label>
        <input
          id="newPassword"
          type="password"
          placeholder="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />

        <button type="submit">Reset Password</button>
      </form>

      {message && <p className="form-message">{message}</p>}

      <div className="toggle-link">
        <Link to="/login">Return to login</Link>
      </div>
    </div>
  );
};

export default ResetPassword;
