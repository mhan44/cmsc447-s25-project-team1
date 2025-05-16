import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import StudentsPage from './pages/StudentPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import CompleteProfilePage from './pages/CompleteProfilePage';
import StudentPage from './pages/StudentPage';
import ParentPage from './pages/ParentPage';
import TherapistPage from './pages/TherapistPage';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType,   setUserType]   = useState('');

  /* ------------------------------------------------------
   * Pull auth flags from localStorage once on mount
   * ---------------------------------------------------- */
  useEffect(() => {
    setIsLoggedIn(localStorage.getItem('isLoggedIn') === 'true');
    setUserType  (localStorage.getItem('userType')   || '');
  }, []);

  /* ------------------------------------------------------
   * ALWAYS read the id fresh from localStorage.
   * (If another tab logs in/out, a simple refresh is enough.)
   * ---------------------------------------------------- */
  const userId = localStorage.getItem('userId');   // ← numeric string or null

  return (
    <Router>
      <Navbar
        isLoggedIn={isLoggedIn}
        setIsLoggedIn={setIsLoggedIn}
        userType={userType}
      />

      <Routes>
        <Route path="/"                element={<HomePage />} />
        <Route path="/students"        element={<StudentsPage />} />
        <Route path="/register"        element={<RegisterPage />} />
        <Route path="/verify-email"    element={<VerifyEmailPage />} />
        <Route path="/complete-profile"element={<CompleteProfilePage />} />
        <Route path="/student"         element={<StudentPage />} />
        <Route path="/parent"          element={<ParentPage />} />

        {/* 🟣  pass the id to TherapistPage */}
        <Route
          path="/therapist"
          element={<TherapistPage therapistId={userId} />}
        />

        <Route
          path="/login"
          element={
            <LoginPage
              setIsLoggedIn={setIsLoggedIn}
              setUserType={setUserType}
            />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;