const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcrypt"); // Import bcrypt for password comparison
// Assuming you have jsonwebtoken installed for creating tokens
const jwt = require('jsonwebtoken');
// Assuming you have a .env file with JWT_SECRET
require('dotenv').config();


// Create an admin - **NOTE: This route does NOT handle email/password/hashing yet.**
// In a real app, you'd likely want to register admins with email/password here
router.post("/", async (req, res) => {
  try {
    // This current route only inserts a name.
    // To support login, your database table and this route
    // would need to handle email and hashed password.
    const { name } = req.body;
    const sql = "INSERT INTO admin_account (name) VALUES (?)"; // Modify this SQL to include email/password_hash
    const [result] = await db.query(sql, [name]);
    res.json({ admin_id: result.insertId, name });
  } catch (err) {
    console.error("Admin creation failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Grab ALL admins - **NOTE: Be cautious exposing this endpoint publicly**
router.get("/", async (req, res) => {
  try {
    // You might want to restrict this endpoint or remove sensitive fields like password_hash
    const [rows] = await db.query("SELECT admin_id, name, email FROM admin_account"); // Excluded password_hash
    res.json(rows);
  } catch (err) {
    console.error("Fetch all admins error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Grab a single admin by ID - **NOTE: Be cautious exposing this endpoint publicly**
router.get("/:id", async (req, res) => {
  try {
    // You might want to restrict this endpoint or remove sensitive fields like password_hash
    const sql = "SELECT admin_id, name, email FROM admin_account WHERE admin_id = ?"; // Excluded password_hash
    const [rows] = await db.query(sql, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Admin not found" });
    res.json(rows[0]);
  } catch (err) {
     console.error("Fetch single admin error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Update an admin - **NOTE: This route does NOT handle email/password updates**
router.put("/:id", async (req, res) => {
  try {
    // This current route only updates name.
    // To support updating email/password, this route would need modifications.
    const { name } = req.body;
    const sql = "UPDATE admin_account SET name = ? WHERE admin_id = ?"; // Modify this SQL for other fields
    await db.query(sql, [name, req.params.id]);
    res.json({ message: "Admin updated successfully" });
  } catch (err) {
     console.error("Update admin error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Delete an admin - **NOTE: Be cautious exposing this endpoint publicly**
router.delete("/:id", async (req, res) => {
  try {
    const sql = "DELETE FROM admin_account WHERE admin_id = ?";
    // Consider adding checks (e.g., are you sure you want to delete the LAST admin?)
    await db.query(sql, [req.params.id]);
    res.json({ message: "Admin deleted successfully" });
  } catch (err) {
    console.error("Delete admin error:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// --- ADMIN LOGIN ROUTE ---
// Handles admin authentication via email and password
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic input validation
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    // 1. Find the admin by email
    // Ensure your admin_account table has 'email' and 'password_hash' columns
    const sql = "SELECT admin_id, name, email, password_hash FROM admin_account WHERE email = ?";
    // For a single specific admin email 'admin', you could hardcode 'admin' here,
    // but querying by the provided email is more flexible if you add more admins.
    const [rows] = await db.query(sql, [email]); // Query using the submitted email

    if (rows.length === 0) {
      // Admin not found - use a generic message for security
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const admin = rows[0];

    // 2. Compare the provided password with the stored hash securely using bcrypt
    // You MUST have hashed 'WaterAlarm' and stored the hash in admin.password_hash
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash); // <<< SECURE COMPARISON

    if (!isPasswordValid) {
      // Password doesn't match - use a generic message for security
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // 3. If authentication is successful
    console.log(`Admin login successful for email: ${admin.email}`);

    // Generate a JSON Web Token (JWT)
    // This token will be sent to the frontend and used to authenticate future requests
    // Ensure you have a JWT_SECRET in your .env file
    const token = jwt.sign(
        { id: admin.admin_id, email: admin.email, role: 'admin' }, // Payload: information to include in the token
        process.env.JWT_SECRET, // Secret key from your environment variables
        { expiresIn: '1h' } // Token expiration time (e.g., 1 hour)
    );

    // Send success response including the token
    res.status(200).json({
      message: "Admin login successful.",
      admin: { id: admin.admin_id, name: admin.name, email: admin.email },
      token: token // Send the generated token to the frontend
    });

  } catch (err) {
    console.error("Error during admin login:", err);
    res.status(500).json({ error: "An error occurred during login." });
  }
});
// --- END ADMIN LOGIN ROUTE ---


module.exports = router; // This should be at the end of the file