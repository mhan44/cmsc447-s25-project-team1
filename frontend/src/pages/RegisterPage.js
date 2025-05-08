// frontend/src/pages/RegisterPage.js

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/AuthPage.css';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    role: 'student',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [pwError, setPwError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (name === 'password' || name === 'confirmPassword') {
      const { password, confirmPassword } = { ...form, [name]: value };
      setPwError(
        password && confirmPassword && password !== confirmPassword
          ? 'Passwords do not match'
          : ''
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pwError) return;
    const { role, email, password } = form;

    let url = '';
    if (role === 'student') {
      url = '/api/students';
    } else if (role === 'parent') {
      url = '/api/parents';
    } else if (role === 'therapist') {
      url = '/api/therapists';
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (res.ok) {
      navigate('/login');
    } else {
      const err = await res.json();
      alert('Error: ' + (err.error || 'Signup failed'));
    }
  };

  return (
    <div className="auth-container">
      <h2>Create an Account</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="role">Role</label>
        <select
          id="role"
          name="role"
          value={form.role}
          onChange={handleChange}
        >
          <option value="student">Student</option>
          <option value="parent">Parent</option>
          <option value="therapist">Therapist</option>
        </select>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          required
        />

        <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          id="confirmPassword"
          type="password"
          name="confirmPassword"
          value={form.confirmPassword}
          onChange={handleChange}
          required
        />
        {pwError && (
          <p style={{ color: 'red', margin: '4px 0' }}>{pwError}</p>
        )}

        <button type="submit" disabled={!!pwError}>
          Sign Up
        </button>
      </form>
      <div className="toggle-link">
        Already have an account? <Link to="/login">Log in</Link>
      </div>
    </div>
  );
}