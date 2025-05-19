import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
// import StudentsPage from './pages/StudentPage'; // This seems duplicated below
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import CompleteProfilePage from './pages/CompleteProfilePage';
import StudentPage from './pages/StudentPage'; // Corrected import
import ParentPage from './pages/ParentPage';
import TherapistPage from './pages/TherapistPage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
// --- IMPORT ADMIN PAGE ---
import AdminPage from './pages/AdminPage'; // Assuming AdminPage.js is in the pages directory
// --- END IMPORT ADMIN PAGE ---


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
        {/* Removed duplicated StudentsPage import and route */}
        <Route path="/register"        element={<RegisterPage />} />
        <Route path="/verify-email"    element={<VerifyEmailPage />} />
        <Route path="/complete-profile"element={<CompleteProfilePage />} />
        {/* 🟣 FIX: pass studentId as prop */}
        <Route path="/student"         element={<StudentPage studentId={userId} />} /> {/* Corrected to use imported StudentPage */}
        <Route path="/parent"          element={<ParentPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

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

        {/* --- ADD ADMIN ROUTE --- */}
        {/* Define the route for the /admin path */}
        <Route path="/admin" element={<AdminPage />} />
        {/* --- END ADD ADMIN ROUTE --- */}

      </Routes>
    </Router>
  );
}

export default App;