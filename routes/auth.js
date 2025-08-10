const express = require("express");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Register new user
router.post("/register", async (req, res) => {
  try {
    const { full_name, email, phone_number, password, user_type } = req.body;

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
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    // Find user by email
    const user = await User.findByEmail(email.toLowerCase().trim());

    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    // Validate password
    const isValidPassword = await User.validatePassword(
      password,
      user.password_hash
    );

    if (!isValidPassword) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    // Create session
    req.session.user = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone_number: user.phone_number,
      user_type: user.user_type,
      location: user.location,
      date_of_birth: user.date_of_birth,
      preferences: user.preferences,
      profile_image: user.profile_image,
    };

    // Log activity
    try {
      await pool.query(
        `INSERT INTO activity_logs (user_id, title, description, type) 
         VALUES ($1, $2, $3, $4)`,
        [user.id, "Login", "User logged in successfully", "login"]
      );
    } catch (logError) {
      console.error("Error logging login activity:", logError);
    }

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        user_type: user.user_type,
        location: user.location,
        profile_image: user.profile_image,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error:
        "Internal server error, PLease check your internet connetion and try again",
    });
  }
});

// Logout user
router.post("/logout", (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ error: "Error during logout" });
      }

      res.clearCookie("connect.sid");
      res.json({ message: "Logout successful" });
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Error during logout" });
  }
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
router.get("/status", async (req, res) => {
  try {
    if (!req.session.user || !req.session.user.id) {
      return res.json({ authenticated: false, user: null });
    }

    const user = await User.findById(req.session.user.id);

    if (!user) {
      req.session.destroy();
      return res.json({ authenticated: false, user: null });
    }

    // Update session with fresh data
    req.session.user = user;

    res.json({
      authenticated: true,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone_number: user.phone_number,
        user_type: user.user_type,
        location: user.location,
        date_of_birth: user.date_of_birth,
        preferences: user.preferences,
        profile_image: user.profile_image,
        created_at: user.created_at,
        updated_at: user.updated_at,
        ...(user.user_type === "planner" && {
          business_name: user.business_name,
          bio: user.bio,
          experience: user.experience,
          specializations: user.specializations,
          base_price: user.base_price,
          home_address: user.home_address,
          average_rating: user.average_rating,
          total_reviews: user.total_reviews,
        }),
      },
    });
  } catch (error) {
    console.error("Error checking auth status:", error);
    res.status(500).json({
      authenticated: false,
      user: null,
      error: "Internal server error",
    });
  }
});

module.exports = router;
