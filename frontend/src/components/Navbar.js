import React, { useState, useEffect } from 'react'; // Added useState back
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock } from '@fortawesome/free-solid-svg-icons'; // Keep faLockOpen for the link icon

const Navbar = ({ isLoggedIn, setIsLoggedIn, userType }) => {
  const navigate = useNavigate();
  // We need state to control the visibility of the admin login modal
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  // State for the input fields in the admin login modal
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  // State for potential login errors in the modal
  const [adminLoginError, setAdminLoginError] = useState('');


  useEffect(() => {
    console.log("Navbar: userType prop:", userType);
    // Ensure modal is closed if userType changes or user logs out
    if (userType !== 'therapist' || !isLoggedIn) {
        setShowAdminLogin(false);
        setAdminEmail('');
        setAdminPassword('');
        setAdminLoginError('');
    }
  }, [userType, isLoggedIn]); // Dependency on userType and isLoggedIn


  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    setIsLoggedIn(false);
    // Close the modal on logout just in case
    setShowAdminLogin(false);
    setAdminEmail('');
    setAdminPassword('');
    setAdminLoginError('');
    navigate("/login");
  };

  const dashboardPath =
    userType === 'parent' ? '/parent' :
    userType === 'student' ? '/student' :
    userType === 'therapist' ? '/therapist' :
    '/';

  // Function to handle the admin login attempt from the modal
  const handleAdminLoginAttempt = async () => { // <<< Function definition starts here
    setAdminLoginError(''); // Clear previous errors

    const credentials = {
        email: adminEmail,
        password: adminPassword
    };

    // --- TEMPORARY BACKEND SIMULATION START ---
    // This replaces the actual fetch call to allow frontend testing
    // REMOVE this entire block (down to END SIMULATION) once your backend login route works

    let simulatedResponse;
    let simulatedData;

    // Simulate checking against the hardcoded credentials
    // Replace 'admin' and 'WaterAlarm' with your actual hardcoded values if different
    const HARDCODED_ADMIN_EMAIL = 'admin';
    const HARDCODED_ADMIN_PASSWORD = 'WaterAlarm';

    // REMOVED: Duplicate function definition was here

    if (credentials.email === HARDCODED_ADMIN_EMAIL && credentials.password === HARDCODED_ADMIN_PASSWORD) {
        // Simulate a successful login response
        console.log("SIMULATION: Successful Admin Login");
        simulatedResponse = { ok: true, status: 200 };
        simulatedData = {
            message: "Simulated login successful.",
            token: "fake_admin_token_for_frontend_testing_12345" // Provide a mock token
            // You could add other mock admin data here if AdminPage needed it from login
            // admin: { id: 1, name: "Simulated Admin", email: credentials.email }
        };
    } else {
        // Simulate a failed login response
        console.log("SIMULATION: Failed Admin Login");
        simulatedResponse = { ok: false, status: 401 };
        simulatedData = {
            message: "Simulated: Invalid email or password." // Mock error message
        };
    }

    // Simulate the async nature of fetch and parsing JSON
    // We create a mock 'response' object that has an 'ok' property and an async 'json' method
    const response = {
        ok: simulatedResponse.ok,
        status: simulatedResponse.status,
        json: async () => {
            // Simulate a small delay if you want, though not strictly necessary
            // await new Promise(resolve => setTimeout(resolve, 100));
            return simulatedData;
        }
    };

    const data = await response.json(); // Parse the simulated JSON response

    // --- TEMPORARY BACKEND SIMULATION END ---


    // --- REST OF YOUR EXISTING FRONTEND LOGIC REMAINS THE SAME ---
    // This part handles the response (whether real or simulated)

    if (response.ok) { // Check if the simulated response status is 'ok'
        console.log("Admin Login Successful:", data);

        // --- SUCCESS STEPS ---
        // Check if the simulated data includes a 'token' field
        if (data.token) {
            // Store the simulated token in localStorage
            localStorage.setItem('adminToken', data.token); // <<< SAVE THE SIMULATED TOKEN HERE
            console.log("Admin token saved to localStorage (simulated).");
        } else {
            console.warn("Admin login successful (simulated), but no token received.");
            // You might want to set an error if a token is mandatory even in simulation
            // setAdminLoginError('Simulated login successful, but failed to get token.');
            // return;
        }

        // Close the modal
        setShowAdminLogin(false);

        // Clear input fields and error messages
        setAdminEmail('');
        setAdminPassword('');
        setAdminLoginError('');

        // Navigate to the Admin page - AdminPage useEffect will now find the simulated token
        navigate('/admin');

    } else { // Simulated Response status is NOT 'ok' (e.g., 401)
        console.error("Admin Login Failed (Simulated):", data.message);
        // Display the simulated error message
        setAdminLoginError(data.message || 'Simulated login failed.');
    }
    // --- END OF EXISTING FRONTEND LOGIC ---

  }; // <<< Function definition ends here


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
            // Links for logged-out users
            <li className="nav-item">
              <Link to="/login" className="nav-link">Login</Link>
            </li>
          ) : (
            // Links for logged-in users
            <>
              <li className="nav-item">
                <Link to={dashboardPath} className="nav-link">
                  Dashboard
                </Link>
              </li>

              {/* --- MODIFIED SECTION --- */}
              {/* Show Admin link ONLY if user is a therapist */}
              {userType === 'therapist' && (
                <li className="nav-item">
                  {/* Use span with onClick to trigger the modal */}
                  <span
                    className="nav-link admin-link"
                    onClick={() => setShowAdminLogin(true)} // Clicking shows the modal
                    style={{ cursor: 'pointer' }} // Indicate it's clickable
                  >
                    <FontAwesomeIcon icon={faLock} /> Admin Login
                  </span>
                </li>
              )}
              {/* --- END MODIFIED SECTION --- */}

              <li className="nav-item">
                <Link to="/login" className="nav-link" onClick={handleLogout}>
                  Logout
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>

      {/* --- ADMIN LOGIN OVERLAY (MODAL) --- */}
      {/* Show the modal only if showAdminLogin state is true */}
      {showAdminLogin && (
        <div className="admin-login-overlay">
          <div className="admin-login-box">
            <h2>Admin Login</h2>
            {/* Display error message if any */}
            {adminLoginError && <p style={{ color: 'red' }}>{adminLoginError}</p>}
            <input
              type="email"
              placeholder="Admin Email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Admin Password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
            />
            {/* Button to trigger the admin login attempt */}
            <button onClick={handleAdminLoginAttempt}>Admin Log In</button>
            {/* Button to close the modal */}
            <button onClick={() => {
                setShowAdminLogin(false); // Close the modal
                setAdminLoginError(''); // Clear errors on close
                setAdminEmail(''); // Clear input fields on close
                setAdminPassword('');
            }}>Close</button>
          </div>
        </div>
      )}
      {/* --- END ADMIN LOGIN OVERLAY --- */}

    </nav>
  );
};

export default Navbar;