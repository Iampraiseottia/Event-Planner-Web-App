const express = require("express");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");
const {
  generateToken,
  getCookieOptions,
  extractTokenFromRequest,
  verifyToken,
} = require("../utils/jwt");

const pool = require("../config/database");

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

    // Create JWT token
    const tokenPayload = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone_number: user.phone_number,
      user_type: user.user_type,
    };

    const token = generateToken(tokenPayload);

    // Set cookie
    res.cookie("authToken", token, getCookieOptions());

    res.status(201).json({
      message: "User registered successfully",
      authenticated: true,
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

    // Create JWT token
    const tokenPayload = {
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

    const token = generateToken(tokenPayload);

    // Set cookie
    res.cookie("authToken", token, getCookieOptions());

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
      authenticated: true,
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
        "Internal server error. Please check your internet connection and try again",
    });
  }
});

// Logout user
router.post("/logout", (req, res) => {
  try {
    // Clear the auth cookie
    res.clearCookie("authToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    res.json({
      message: "Logout successful",
      authenticated: false,
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Error during logout" });
  }
});

// Get current user
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
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
    const userId = req.user.id;

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

    // Create new token with updated data
    const tokenPayload = {
      ...req.user,
      full_name: updatedUser.full_name,
      email: updatedUser.email,
      phone_number: updatedUser.phone_number,
    };

    const newToken = generateToken(tokenPayload);
    res.cookie("authToken", newToken, getCookieOptions());

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
    const token = extractTokenFromRequest(req);

    if (!token) {
      return res.json({
        authenticated: false,
        user: null,
      });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      // Clear invalid cookie
      res.clearCookie("authToken");
      return res.json({
        authenticated: false,
        user: null,
      });
    }

    // Get fresh user data from database
    const user = await User.findById(decoded.id);

    if (!user) {
      res.clearCookie("authToken");
      return res.json({
        authenticated: false,
        user: null,
      });
    }

    // Check profile completion for planners
    let profileComplete = true;
    if (user.user_type === "planner") {
      const profileCheck = await pool.query(
        `
        SELECT 
          CASE WHEN 
            u.id_card_data IS NOT NULL AND 
            u.birth_certificate_data IS NOT NULL AND
            EXISTS (
              SELECT 1 FROM planners p 
              WHERE p.user_id = u.id 
              AND p.business_name IS NOT NULL 
              AND p.bio IS NOT NULL 
              AND p.experience IS NOT NULL 
              AND p.base_price IS NOT NULL
            )
          THEN TRUE ELSE FALSE END as is_complete
        FROM users u WHERE u.id = $1
      `,
        [user.id]
      );

      profileComplete = profileCheck.rows[0]?.is_complete || false;

      if (user.profile_completed !== profileComplete) {
        await pool.query(
          "UPDATE users SET profile_completed = $1 WHERE id = $2",
          [profileComplete, user.id]
        );
        user.profile_completed = profileComplete;
      }
    }

    const tokenPayload = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone_number: user.phone_number,
      user_type: user.user_type,
      location: user.location,
      date_of_birth: user.date_of_birth,
      preferences: user.preferences,
      profile_image: user.profile_image,
      profile_completed: profileComplete,
    };

    const freshToken = generateToken(tokenPayload);
    res.cookie("authToken", freshToken, getCookieOptions());

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
        profile_completed: profileComplete,
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
