// frontend/src/pages/AdminPage.js

import React, { useState, useEffect } from 'react';
// Import Link for navigation from react-router-dom
import { useNavigate, Link } from 'react-router-dom';
import '../styles/AdminPage.css';
// Assuming getStudents fetches all students and updateStudent might be used elsewhere
import { getStudents, updateStudent } from '../services/studentService';

const AdminPage = () => {
  const navigate = useNavigate();
  const [unapprovedTherapists, setUnapprovedTherapists] = useState([]);
  const [students, setStudents] = useState([]);
  const [parents, setParents] = useState([]);
  // const [currentParent, setCurrentParent] = useState(null); // This state doesn't seem used

  // --- AUTH CHECK (IMPORTANT SECURITY CONSIDERATION) ---
  // Ensure admin authentication before fetching data
  useEffect(() => {
      const adminToken = localStorage.getItem('adminToken'); // Or wherever you store it
      if (!adminToken) {
          console.warn("Admin page accessed without authentication. Redirecting.");
          navigate('/login'); // Redirect to login page if not authenticated
      } else {
          // Fetch data ONLY if authenticated
          fetchUnapprovedTherapists();
          fetchStudents();
          fetchParents();
      }
      // Added navigate dependency
  }, [navigate]);


  // Fetches therapists awaiting approval
  const fetchUnapprovedTherapists = async () => {
    try {
      // Ensure backend route handles unapprovedOnly=true and returns { id, name, email, ... }
      const response = await fetch('/api/therapists?unapprovedOnly=true');
      if (response.ok) {
        const data = await response.json();
        setUnapprovedTherapists(data); // Data should be an array of therapist objects
      } else {
        console.error('Failed to fetch unapproved therapists:', response.status, response.statusText);
        setUnapprovedTherapists([]); // Set to empty array on error
      }
    } catch (error) {
      console.error('Error fetching unapproved therapists:', error);
      setUnapprovedTherapists([]); // Set to empty array on error
    }
  };

  // Fetches all students
  const fetchStudents = async () => {
    try {
       // Assuming your backend GET /api/students route exists and returns an array
      const response = await fetch('/api/students');
      if (response.ok) {
         const data = await response.json();
         // Assuming data is an array of student objects with { student_id, name, ...}
         setStudents(data);
      } else {
         console.error('Failed to fetch students:', response.status, response.statusText);
          setStudents([]); // Set to empty on error
      }

    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]); // Set to empty on error
    }
  };

  // Fetches all parents
  const fetchParents = async () => {
    try {
      // Ensure backend GET /api/parents route exists and returns array with { parent_id, name, email, student_id }
      const response = await fetch('/api/parents');
      if (response.ok) {
        const data = await response.json();
        // Assuming data is an array of parent objects
        setParents(data);
      } else {
        console.error('Failed to fetch parents:', response.status, response.statusText);
        setParents([]); // Set parents to empty array on error
      }
    } catch (error) {
      console.error('Error fetching parents:', error);
      setParents([]); // Set to empty on error
    }
  };

  // --- FUNCTION TO APPROVE THERAPIST ---
  const approveTherapist = async (therapistId) => {
    try {
      // **IMPORTANT:** Replace '1' with the actual ID of the logged-in admin.
      // This ID should come from your authentication token or context.
      const currentAdminId = 1; // Placeholder - GET ACTUAL ADMIN ID

      const response = await fetch(`/api/therapists/${therapistId}/approve`, {
        method: 'PUT',
        headers: {
             'Content-Type': 'application/json',
             // **IMPORTANT:** Include the admin authentication token here if your backend requires it
             // 'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ admin_id: currentAdminId })
      });

      if (response.ok) {
        console.log(`Therapist ${therapistId} approved successfully.`);
        fetchUnapprovedTherapists(); // Refresh the list after approval
        // Optionally show a success message to the admin
        // alert('Therapist approved successfully!');
      } else {
        const errorData = await response.json();
        console.error('Failed to approve therapist:', response.status, response.statusText, errorData.message);
        alert(`Failed to approve therapist: ${errorData.message || response.statusText}`); // Show user feedback
      }
    } catch (error) {
      console.error('Error approving therapist:', error);
      alert('An error occurred while approving therapist.'); // Show user feedback
    }
  };
  // --- END FUNCTION TO APPROVE THERAPIST ---


  // Handles assigning/updating a student for a parent
  const handleStudentChange = async (parentId, studentId) => {
    try {
      // Ensure backend PUT /api/parents/:id handles updating student_id
      const response = await fetch(`/api/parents/${parentId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            // **IMPORTANT:** Include the admin authentication token here if your backend requires it
            // 'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        // Send the student_id to update the parent record (or null if unassigning)
        body: JSON.stringify({ student_id: studentId === '' ? null : studentId })
      });

      if (response.ok) {
        console.log(`Parent ${parentId} updated with student ${studentId}.`);
        fetchParents(); // Refresh the parent list to show the change
        // Optionally show success message
        // alert('Parent-student relationship updated!');
      } else {
        const errorData = await response.json();
        console.error('Failed to update parent student relationship:', response.status, response.statusText, errorData.message);
        alert(`Failed to update relationship: ${errorData.message || response.statusText}`); // Show user feedback
      }
    } catch (error) {
      console.error('Error updating parent student relationship:', error);
       alert('An error occurred while updating the relationship.'); // Show user feedback
    }
  };

  // --- NAVIGATION HANDLERS (ADMIN VIEWING USER PAGES) ---
  // Function to navigate to a user's page
  const viewUserPage = (type, id) => {
      // Ensure your App.js routes /parent and /student can handle IDs as parameters
      // e.g., <Route path="/parent/:parentId" element={<ParentPage />} />
      // e.g., <Route path="/student/:studentId" element={<StudentPage />} />
      navigate(`/${type}/${id}`);
  };
  // --- END NAVIGATION HANDLERS ---


  return (
    <div className="admin-page">
      <h2>Admin Dashboard</h2>

      {/* --- UNAPPROVED THERAPISTS SECTION --- */}
      <div className="section">
        <h3>Unapproved Therapists</h3>
        {/* Check if array is not empty before mapping */}
        {unapprovedTherapists.length > 0 ? (
          <ul>
            {unapprovedTherapists.map((therapist) => (
              // Use therapist.id for the key as it's unique
              <li key={therapist.id}>
                {/* Make the therapist name/email a clickable Link */}
                <Link to={`/therapist/${therapist.id}`} className="user-link"> {/* Added Link */}
                  {/* Display the therapist's name (or name and email) */}
                  {/* Make sure your backend GET /api/therapists?unapprovedOnly=true is returning 'name' and 'email' */}
                  {therapist.name} ({therapist.email})
                </Link>
                {/* Approve button */}
                <button onClick={() => approveTherapist(therapist.id)}>Approve</button> {/* Use therapist.id */}
              </li>
            ))}
          </ul>
        ) : (
          <p>No therapists awaiting approval.</p>
        )}
      </div>
       {/* --- END UNAPPROVED THERAPISTS SECTION --- */}


      {/* --- MANAGE PARENT-STUDENT RELATIONSHIPS SECTION --- */}
      <div className="section">
        <h3>Manage Parent-Student Relationships</h3>
        {/* Check if parents array is not empty before mapping */}
        {parents.length > 0 ? (
            parents.map(parent => (
              // Use parent.parent_id for the key
              <div key={parent.parent_id} className="parent-student-item"> {/* Added class for styling */}
                {/* Display the parent's name (or name and email) and make it a clickable Link */}
                {/* Make sure your backend GET /api/parents is returning 'name' and 'email' */}
                <p>
                  <Link to={`/parent/${parent.parent_id}`} className="user-link"> {/* Added Link */}
                     {parent.name} ({parent.email})
                  </Link>
                  {/* --- Conditionally display View Student Link --- */}
                  {/* Check if the parent is linked to a student */}
                  {parent.student_id && (
                       <span> {/* Use a span to contain the links if needed */}
                            {' | '} {/* Separator */}
                           <Link to={`/student/${parent.student_id}`} className="user-link view-student-link">View Student</Link> {/* Added Link */}
                       </span>
                   )}
                   {/* --- End View Student Link --- */}
                </p>
                {/* Select dropdown for assigning a student */}
                 {/* Make sure your backend GET /api/parents returns parent objects with 'student_id' */}
                 {/* Make sure your backend GET /api/students returns student objects with 'student_id' and 'name' */}
                <select
                  value={parent.student_id || ''} // Use the student_id assigned to the parent (or empty string if none)
                  onChange={(e) => handleStudentChange(parent.parent_id, Number(e.target.value))}
                >
                  <option value="">Select Student</option> {/* Option for no student (value='') */}
                  {/* Check if students array is not empty before mapping */}
                  {students.length > 0 ? (
                       students.map(student => (
                         // Use student.student_id for the value and key
                         <option key={student.student_id} value={student.student_id}>
                           {student.name} {/* Student name is already correctly displayed */}
                         </option>
                       ))
                   ) : (
                       // Message when no students are loaded (either none in DB or fetch failed)
                       <option value="" disabled>Loading students...</option>
                   )}
                </select>
              </div>
            ))
        ) : (
            <p>No parents found or loading...</p> // Message when no parents are loaded
        )}
      </div>
       {/* --- END MANAGE PARENT-STUDENT RELATIONSHIPS SECTION --- */}
    </div>
  );
};

export default AdminPage;