import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AuthPage.css';

export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const userType = localStorage.getItem("userType"); // 'student'|'parent'|'therapist'
  const userId   = localStorage.getItem("userId");

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    age: '',
    address: '',
    zip_code: '',
    specialties: ''  // comma-separated list
  });

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    // Build payload; only include specialties for therapists
    const payload = {
      first_name:  form.first_name,
      last_name:   form.last_name,
      phone_number:form.phone_number,
      age:         form.age,
      address:     form.address,
      zip_code:    form.zip_code,
      ...(userType === 'therapist' && {
        specialties: form.specialties
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      })
    };

    const url = `/api/${userType}s/${userId}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      navigate(`/${userType}`);
    } else {
      const err = await res.json();
      alert('Update failed: ' + err.error);
    }
  };

  return (
    <div className="auth-container">
      <h2>Complete Your Profile</h2>
      <form onSubmit={handleSubmit}>
        <label>First Name</label>
        <input
          name="first_name"
          value={form.first_name}
          onChange={handleChange}
          required
        />

        <label>Last Name</label>
        <input
          name="last_name"
          value={form.last_name}
          onChange={handleChange}
          required
        />

        <label>Phone Number</label>
        <input
          name="phone_number"
          type="tel"
          pattern="[0-9]{10}"
          placeholder="1234567890"
          value={form.phone_number}
          onChange={handleChange}
          required
        />
        <small>Enter 10 digits, numbers only.</small>

        <label>Age</label>
        <input
          name="age"
          type="number"
          value={form.age}
          onChange={handleChange}
          required
        />

        <label>Address</label>
        <input
          name="address"
          value={form.address}
          onChange={handleChange}
          required
        />

        <label>Zip Code</label>
        <input
          name="zip_code"
          value={form.zip_code}
          onChange={handleChange}
          required
        />

        {userType === 'therapist' && (
          <>
            <label>Specialties</label>
            <input
              name="specialties"
              value={form.specialties}
              onChange={handleChange}
              placeholder="e.g. Anxiety, Family Therapy, CBT"
            />
            <small>Enter comma-separated specialties.</small>
          </>
        )}

        <button type="submit">Save Profile</button>
      </form>
    </div>
  );
}