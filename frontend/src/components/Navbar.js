import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = ({ isLoggedIn, setIsLoggedIn, userType }) => {
  const navigate = useNavigate();

  //On logout, setIsLoggedIn -> false, redirect to login page
  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    setIsLoggedIn(false);
    navigate("/login");
  };

  const dashboardPath =
    userType === 'parent' ? '/parent' :
    userType === 'student' ? '/student' :
    userType === 'therapist' ? '/therapist' :
    '/';

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          Therapy Scheduler
        </Link>
        <ul className="nav-menu">
          <li className="nav-item">
            <Link to="/" className="nav-link">Home</Link>
          </li>
          {!isLoggedIn ? (
            <li className="nav-item">
              <Link to="/login" className="nav-link">Login</Link>
            </li>
          ) : (
            <>
              <li className="nav-item">
                <Link to={dashboardPath} className="nav-link">
                  Dashboard
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/login" className="nav-link" onClick={handleLogout}>
                  Logout
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};


export default Navbar;