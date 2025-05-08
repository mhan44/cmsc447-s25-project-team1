import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/AuthPage.css';

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState(''); // 'verifying','success','error','sent','pending','resending'
  const [message, setMessage] = useState('');

  const query = new URLSearchParams(location.search);
  const token = query.get('token');
  const email = query.get('email');
  const role  = query.get('role');

  useEffect(() => {
    if (token && email) {
      setStatus('verifying');
      fetch(`/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`)
        .then(res => {
          if (res.ok) {
            setStatus('success');
            setMessage('Your email has been verified! You can now log in.');
          } else {
            res.json().then(data => {
              setStatus('error');
              setMessage(data.error || 'Verification failed.');
            });
          }
        })
        .catch(() => {
          setStatus('error');
          setMessage('An unexpected error occurred.');
        });
    } else {
      setStatus('pending');
    }
  }, [token, email]);

  const handleResend = async () => {
    setStatus('resending');
    try {
      const res = await fetch('/api/auth/resend-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role })
      });
      if (res.ok) {
        setStatus('sent');
        setMessage('A new verification email has been sent.');
      } else {
        const data = await res.json();
        setStatus('error');
        setMessage(data.error || 'Failed to resend email.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error while resending email.');
    }
  };

  return (
    <div className="auth-container">
      {token ? (
        status === 'verifying' ? (
          <p>Verifying your email...</p>
        ) : (
          <p>{message}</p>
        )
      ) : (
        <>
          <h2>Verify Your Email</h2>
          <p>Please check your inbox for a verification link we sent to <strong>{email}</strong>.</p>
          <button onClick={handleResend} disabled={status === 'resending'}>
            Resend Verification Email
          </button>
          {message && <p>{message}</p>}
        </>
      )}
    </div>
  );
}
