import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/AuthPage.css';

export default function LoginPage({ setIsLoggedIn, setUserType }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    role: 'student',
    email: '',
    password: ''
  });

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });

    if (res.ok) {
      const data = await res.json();
      localStorage.setItem("isLoggedIn", "true");
      setIsLoggedIn(true);
      localStorage.setItem("userType", data.role.toLowerCase());
      setUserType(data.role.toLowerCase());
      localStorage.setItem("userId", data.id);

      if (data.profileComplete) {
        navigate(`/${data.role.toLowerCase()}`);
      } else {
        navigate('/complete-profile');
      }
    } else {
      const err = await res.json();
      if (err.error === 'EMAIL_NOT_VERIFIED') {
        navigate(`/verify-email?email=${encodeURIComponent(form.email)}&role=${form.role}`);
      } else {
        alert('Login failed: ' + err.error);
      }
    }
  };

  return (
    <div className="auth-container">
      <h2>Log In</h2>
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

        <button type="submit">Log In</button>
      </form>
      <div className="toggle-link">
        New here? <Link to="/register">Sign up</Link>
      </div>
    </div>
  );
}