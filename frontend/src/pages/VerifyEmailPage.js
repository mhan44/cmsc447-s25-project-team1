// frontend/src/pages/VerifyEmailPage.js

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/AuthPage.css';

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('pending'); // pending | success | error
  const [message, setMessage] = useState('');

  // Extract query params once
  const params = new URLSearchParams(location.search);
  const token = params.get('token');
  const email = params.get('email');
  const role  = params.get('role');

  // Run verification only once on mount
  useEffect(() => {
    if (token && email) {
      setStatus('verifying');
      fetch(`/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`)
        .then(res => {
          if (!res.ok) throw res;
          return res.json();
        })
        .then(() => {
          // Success: redirect immediately
          navigate('/login');
        })
        .catch(async errResp => {
          let errMsg = 'Verification failed.';
          try {
            const body = await errResp.json();
            errMsg = body.error || errMsg;
          } catch {}
          setStatus('error');
          setMessage(errMsg);
        });
    }
  // NOTE: empty deps => run only once
  }, []);

  const handleResend = async () => {
    setStatus('resending');
    try {
      const res = await fetch('/api/auth/resend-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      if (!res.ok) throw res;
      setStatus('pending');
      setMessage('A new verification email has been sent. Please check your inbox.');
    } catch {
      setStatus('error');
      setMessage('Failed to resend verification email.');
    }
  };

  // If we had no token (user navigated manually), show resend UI
  if (!token) {
    return (
      <div className="auth-container">
        <h2>Verify Your Email</h2>
        <p>
          We haven’t sent you a link yet. Enter your email on the login page to request a verification link.
        </p>
      </div>
    );
  }

  // While verifying, show a spinner/text
  if (status === 'verifying') {
    return (
      <div className="auth-container">
        <p>Verifying your email...</p>
      </div>
    );
  }

  // On error, show message + resend button
  if (status === 'error') {
    return (
      <div className="auth-container">
        <p style={{ color: 'red' }}>{message}</p>
        <button onClick={handleResend}>Resend Verification Email</button>
      </div>
    );
  }

  // We never actually render the success state here because we immediately navigate to /login.
  // But to cover edge cases:
  return null;
}