const express = require("express");
const { requireAuth, requireCustomer } = require("../middleware/auth");
const Booking = require("../models/Booking");
const pool = require("../config/database");
const User = require("../models/User");
const upload = require("../utils/fileUpload");

const router = express.Router();

// Get customer statistics
router.get("/stats", requireAuth, requireCustomer, async (req, res) => {
  try {
    const customerId = req.session.user.id;

    const statsQuery = `
      SELECT 
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN status = 'confirmed' AND event_date > CURRENT_DATE THEN 1 END) as upcoming_events,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_events,
        array_agg(CASE WHEN status = 'completed' THEN category ELSE NULL END) as completed_categories
      FROM bookings 
      WHERE customer_id = $1 AND deleted_at IS NULL
    `;

    // Get total spent from payments 
    const paymentsQuery = `
      SELECT COALESCE(SUM(amount), 0) as total_from_payments
      FROM payments 
      WHERE customer_id = $1 AND payment_status = 'completed'
    `;

    const [statsResult, paymentsResult] = await Promise.all([
      pool.query(statsQuery, [customerId]),
      pool.query(paymentsQuery, [customerId])
    ]);

    const stats = statsResult.rows[0];
    const payments = paymentsResult.rows[0];

    // Extract price from category string
    const extractPriceFromCategory = (category) => {
      if (!category) return 0;
      
      const priceMap = {
        'Platinum ~ 2.5M': 2500000,
        'Diamond ~ 1.5M': 1500000,
        'Gold ~ 1.0M': 1000000,
        'Bronze ~ 800K': 800000,
        'Silver ~ 500K': 500000,
        'High Class ~ 250K': 250000,
        'Normal Class ~ 120K': 120000,
        'Lowest Class ~ 80K': 80000
      };
      
      return priceMap[category] || 0;
    };

    // Calculate total spent from completed bookings
    let totalFromBookings = 0;
    if (stats.completed_categories && Array.isArray(stats.completed_categories)) {
      totalFromBookings = stats.completed_categories
        .filter(category => category !== null)
        .reduce((sum, category) => sum + extractPriceFromCategory(category), 0);
    }

    // Calculate total spent by combining both sources
    const totalSpent = totalFromBookings + parseFloat(payments.total_from_payments);

    res.json({
      totalBookings: parseInt(stats.total_bookings) || 0,
      upcomingEvents: parseInt(stats.upcoming_events) || 0,
      completedEvents: parseInt(stats.completed_events) || 0,
      totalSpent: totalSpent || 0,
    });
  } catch (error) {
    console.error("Error loading customer stats:", error);
    res.status(500).json({
      error: "Failed to load statistics",
      totalBookings: 0,
      upcomingEvents: 0,
      completedEvents: 0,
      totalSpent: 0,
    });
  }
});


// Get customer bookings
router.get("/bookings", requireAuth, requireCustomer, async (req, res) => {
  try {
    const customerId = req.session.user.id;

    const query = `
      SELECT b.*, 
             u.full_name as planner_name,
             u.phone_number as planner_phone,
             u.email as planner_email
      FROM bookings b
      LEFT JOIN users u ON b.planner_id = u.id
      WHERE b.customer_id = $1 AND (b.deleted_at IS NULL OR b.deleted_at IS NULL)
      ORDER BY b.created_at DESC
    `;

    const result = await pool.query(query, [customerId]);

    // Transform the data to ensure all required fields are present
    const bookings = result.rows.map((booking) => ({
      ...booking,
      status: booking.status || "pending",
      planner_name: booking.planner_name || "Not assigned",
      event_time: booking.event_time || "Time TBD",
      requirements: booking.requirements || "",
    }));

    res.json(bookings);
  } catch (error) {
    console.error("Error loading bookings:", error);
    res.status(500).json({
      error: "Failed to load bookings",
      bookings: [], // Return empty array as fallback
    });
  }
});


// Get specific booking
router.get("/bookings/:id", requireAuth, requireCustomer, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const customerId = req.session.user.id;

    const query = `
      SELECT b.*, 
             u.full_name as planner_name,
             u.phone_number as planner_phone,
             u.email as planner_email,
             p.business_name,
             p.bio as planner_bio
      FROM bookings b
      JOIN users u ON b.planner_id = u.id
      LEFT JOIN planners p ON u.id = p.user_id
      WHERE b.id = $1 AND b.customer_id = $2 AND b.deleted_at IS NULL
    `;

    const result = await pool.query(query, [bookingId, customerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error loading booking details:", error);
    res.status(500).json({ error: "Failed to load booking details" });
  }
});

// Get upcoming events
router.get(
  "/upcoming-events",
  requireAuth,
  requireCustomer,
  async (req, res) => {
    try {
      const customerId = req.session.user.id;

      const query = `
      SELECT b.*, 
             u.full_name as planner_name,
             u.phone_number as planner_phone,
             u.email as planner_email
      FROM bookings b
      JOIN users u ON b.planner_id = u.id
      WHERE b.customer_id = $1 
        AND b.event_date > CURRENT_DATE 
        AND b.status IN ('confirmed', 'in-progress')
        AND b.deleted_at IS NULL
      ORDER BY b.event_date ASC
    `;

      const result = await pool.query(query, [customerId]);
      res.json(result.rows);
    } catch (error) {
      console.error("Error loading upcoming events:", error);
      res.status(500).json({ error: "Failed to load upcoming events" });
    }
  }
);

// Get event history
router.get("/event-history", requireAuth, requireCustomer, async (req, res) => {
  try {
    const customerId = req.session.user.id;

    const query = `
      SELECT b.*, 
             u.full_name as planner_name,
             r.rating,
             r.comment as review
      FROM bookings b
      JOIN users u ON b.planner_id = u.id
      LEFT JOIN reviews r ON b.id = r.booking_id
      WHERE b.customer_id = $1 
        AND b.status = 'completed'
        AND b.deleted_at IS NULL
      ORDER BY b.event_date DESC
    `;

    const result = await pool.query(query, [customerId]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error loading event history:", error);
    res.status(500).json({ error: "Failed to load event history" });
  }
});

// Get notifications
router.get("/notifications", requireAuth, requireCustomer, async (req, res) => {
  try {
    const customerId = req.session.user.id;

    const query = `
      SELECT id, title, message, type, is_read as read, created_at
      FROM notifications
      WHERE user_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 50
    `;

    const result = await pool.query(query, [customerId]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error loading notifications:", error);
    res.status(500).json({ error: "Failed to load notifications" });
  }
});

// Get recent activity
router.get("/activity", requireAuth, requireCustomer, async (req, res) => {
  try {
    const customerId = req.session.user.id;

    const query = `
      SELECT title, description, type, created_at
      FROM activity_logs
      WHERE user_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 10
    `;

    const result = await pool.query(query, [customerId]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error loading activity:", error);
    res.status(500).json({ error: "Failed to load activity" });
  }
});

// Mark all notifications as read
router.post(
  "/notifications/mark-all-read",
  requireAuth,
  requireCustomer,
  async (req, res) => {
    try {
      const customerId = req.session.user.id;

      const query = `
      UPDATE notifications 
      SET is_read = true
      WHERE user_id = $1 AND is_read = false AND deleted_at IS NULL
    `;

      const result = await pool.query(query, [customerId]);
      res.json({
        message: "All notifications marked as read",
        updated: result.rowCount,
      });
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      res.status(500).json({ error: "Failed to update notifications" });
    }
  }
);

// Clear all notifications
router.delete(
  "/notifications/clear",
  requireAuth,
  requireCustomer,
  async (req, res) => {
    try {
      const customerId = req.session.user.id;

      const query = `
      UPDATE notifications 
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND deleted_at IS NULL
    `;

      const result = await pool.query(query, [customerId]);
      res.json({
        message: "All notifications cleared",
        cleared: result.rowCount,
      });
    } catch (error) {
      console.error("Error clearing notifications:", error);
      res.status(500).json({ error: "Failed to clear notifications" });
    }
  }
);

// Upload profile image
router.post(
  "/profile/upload-image",
  requireAuth,
  requireCustomer,
  upload.single("profileImage"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const userId = req.session.user.id;
      const imageUrl = `/uploads/${req.file.filename}`;

      // Update database using User model
      const result = await User.updateProfileImage(userId, imageUrl);

      // Update session
      req.session.user.profile_image = result.profile_image;

      res.json({
        message: "Profile image updated successfully",
        imageUrl: result.profile_image,
      });
    } catch (error) {
      console.error("Error uploading profile image:", error);
      res.status(500).json({
        error: error.message || "Failed to upload image",
      });
    }
  }
);

// Update customer profile
router.put("/profile", requireAuth, requireCustomer, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const profileData = req.body;

    if (profileData.email && !User.isValidEmail(profileData.email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (
      profileData.phone_number &&
      !User.isValidPhone(profileData.phone_number)
    ) {
      return res.status(400).json({ error: "Invalid phone number format" });
    }

    // Update user in database
    const updatedUser = await User.update(userId, profileData);

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update session with new user data
    req.session.user = {
      ...req.session.user,
      ...updatedUser,
    };

    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      error: error.message || "Failed to update profile",
    });
  }
});

module.exports = router;
