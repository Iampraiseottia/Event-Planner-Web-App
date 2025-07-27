const express = require("express");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Register new user
router.post("/register", async (req, res) => {
  try {
    const { full_name, email, phone_number, password, user_type } = req.body;

    // Validate required fields
    if (!full_name || !email || !password) {
      return res.status(400).json({
        error: "Full name, email, and password are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Please provide a valid email address",
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters long",
      });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        error: "User with this email already exists",
      });
    }

    // Create new user
    const userData = {
      full_name,
      email,
      phone_number,
      password,
      user_type: user_type || "customer",
    };

    const user = await User.create(userData);

    // Store user in session
    req.session.user = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone_number: user.phone_number,
      user_type: user.user_type,
    };

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone_number: user.phone_number,
        user_type: user.user_type,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      error: error.message || "Registration failed. Please try again.",
    });
  }
});

// Login user
router.post("/login", async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(400).json({
        error: "Invalid email or password",
      });
    }

    // Validate password
    const isValidPassword = await User.validatePassword(
      password,
      user.password_hash
    );
    if (!isValidPassword) {
      return res.status(400).json({
        error: "Invalid email or password",
      });
    }

    // Optional: Validate full name if provided (extra security)
    if (full_name && user.full_name.toLowerCase() !== full_name.toLowerCase()) {
      return res.status(400).json({
        error: "Invalid credentials",
      });
    }

    // Store user in session
    req.session.user = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone_number: user.phone_number,
      user_type: user.user_type,
    };

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone_number: user.phone_number,
        user_type: user.user_type,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error: "Login failed. Please try again.",
    });
  }
});

// Logout user
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({
        error: "Logout failed",
      });
    }

    res.clearCookie("connect.sid"); // Clear session cookie
    res.json({
      message: "Logout successful",
    });
  });
});

// Get current user
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    res.json({
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone_number: user.phone_number,
        user_type: user.user_type,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      error: "Failed to get user information",
    });
  }
});

// Update user profile
router.put("/profile", requireAuth, async (req, res) => {
  try {
    const { full_name, email, phone_number } = req.body;
    const userId = req.session.user.id;

    // Validate required fields
    if (!full_name || !email) {
      return res.status(400).json({
        error: "Full name and email are required",
      });
    }

    // Check if email is already taken by another user
    const existingUser = await User.findByEmail(email);
    if (existingUser && existingUser.id !== userId) {
      return res.status(400).json({
        error: "Email is already taken by another user",
      });
    }

    const updatedUser = await User.update(userId, {
      full_name,
      email,
      phone_number,
    });

    // Update session data
    req.session.user = {
      ...req.session.user,
      full_name: updatedUser.full_name,
      email: updatedUser.email,
      phone_number: updatedUser.phone_number,
    };

    res.json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        full_name: updatedUser.full_name,
        email: updatedUser.email,
        phone_number: updatedUser.phone_number,
        user_type: updatedUser.user_type,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({
      error: error.message || "Profile update failed",
    });
  }
});

// Check authentication status
router.get("/status", (req, res) => {
  if (req.session && req.session.user) {
    res.json({
      authenticated: true,
      user: req.session.user,
    });
  } else {
    res.json({
      authenticated: false,
      user: null,
    });
  }
});

module.exports = router;
