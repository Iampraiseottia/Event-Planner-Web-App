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
      pool.query(paymentsQuery, [customerId]),
    ]);

    const stats = statsResult.rows[0];
    const payments = paymentsResult.rows[0];

    // Extract price from category string
    const extractPriceFromCategory = (category) => {
      if (!category) return 0;

      const priceMap = {
        "Platinum ~ 2.5M": 2500000,
        "Diamond ~ 1.5M": 1500000,
        "Gold ~ 1.0M": 1000000,
        "Bronze ~ 800K": 800000,
        "Silver ~ 500K": 500000,
        "High Class ~ 250K": 250000,
        "Normal Class ~ 120K": 120000,
        "Lowest Class ~ 80K": 80000,
      };

      return priceMap[category] || 0;
    };

    // Calculate total spent from completed bookings
    let totalFromBookings = 0;
    if (
      stats.completed_categories &&
      Array.isArray(stats.completed_categories)
    ) {
      totalFromBookings = stats.completed_categories
        .filter((category) => category !== null)
        .reduce((sum, category) => sum + extractPriceFromCategory(category), 0);
    }

    // Calculate total spent by combining both sources
    const totalSpent =
      totalFromBookings + parseFloat(payments.total_from_payments);

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
      bookings: [], 
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
      const imageBuffer = req.file.buffer;
      const mimeType = req.file.mimetype;

      const query = `
        UPDATE users 
        SET profile_image_data = $1, profile_image_mime_type = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING profile_image_data, profile_image_mime_type
      `;

      const result = await pool.query(query, [imageBuffer, mimeType, userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      // Update the session with the new data
      req.session.user.profile_image_data = result.rows[0].profile_image_data;
      req.session.user.profile_image_mime_type =
        result.rows[0].profile_image_mime_type;

      res.json({
        message: "Profile image updated successfully",
      });
    } catch (error) {
      console.error("Error uploading profile image:", error);
      res.status(500).json({
        error: error.message || "Failed to upload image",
      });
    }
  }
);

// Get Profile Image
router.get("/profile/image", requireAuth, requireCustomer, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const query = `
      SELECT profile_image_data, profile_image_mime_type FROM users WHERE id = $1
    `;

    const result = await pool.query(query, [userId]);
    const user = result.rows[0];

    if (!user || !user.profile_image_data) {
      return res.status(404).json({ error: "Image not found" });
    }

    res.set("Content-Type", user.profile_image_mime_type);
    res.send(user.profile_image_data);
  } catch (error) {
    console.error("Error getting profile image:", error);
    res.status(500).json({ error: "Failed to retrieve image" });
  }
});

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

// Get customer's reviews
router.get("/reviews", requireAuth, requireCustomer, async (req, res) => {
  try {
    const customerId = req.session.user.id;

    const query = `
      SELECT r.*, 
             b.event_type, 
             b.event_date,
             u.full_name as planner_name,
             p.business_name
      FROM reviews r
      JOIN bookings b ON r.booking_id = b.id
      JOIN users u ON b.planner_id = u.id
      LEFT JOIN planners p ON u.id = p.user_id
      WHERE r.customer_id = $1
      ORDER BY r.created_at DESC
    `;

    const result = await pool.query(query, [customerId]);

    const reviews = result.rows.map((review) => ({
      ...review,
      planner_name: review.business_name || review.planner_name,
    }));

    res.json(reviews);
  } catch (error) {
    console.error("Error loading customer reviews:", error);
    res.status(500).json({ error: "Failed to load reviews" });
  }
});

// Get specific review by booking ID
router.get(
  "/reviews/:bookingId",
  requireAuth,
  requireCustomer,
  async (req, res) => {
    try {
      const bookingId = req.params.bookingId;
      const customerId = req.session.user.id;

      const query = `
      SELECT r.*, 
             b.event_type, 
             b.event_date,
             u.full_name as planner_name,
             p.business_name
      FROM reviews r
      JOIN bookings b ON r.booking_id = b.id
      JOIN users u ON b.planner_id = u.id
      LEFT JOIN planners p ON u.id = p.user_id
      WHERE r.booking_id = $1 AND r.customer_id = $2
    `;

      const result = await pool.query(query, [bookingId, customerId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Review not found" });
      }

      const review = result.rows[0];
      review.planner_name = review.business_name || review.planner_name;

      res.json(review);
    } catch (error) {
      console.error("Error loading review:", error);
      res.status(500).json({ error: "Failed to load review" });
    }
  }
);

// New review
router.post("/reviews", requireAuth, requireCustomer, async (req, res) => {
  try {
    const customerId = req.session.user.id;
    const { booking_id, rating, comment } = req.body;

    if (!booking_id || !rating || !comment) {
      return res.status(400).json({
        error: "Booking ID, rating, and comment are required",
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        error: "Rating must be between 1 and 5",
      });
    }

    // Check if booking belongs to customer and is completed
    const bookingQuery = `
      SELECT id, planner_id, status 
      FROM bookings 
      WHERE id = $1 AND customer_id = $2 AND deleted_at IS NULL
    `;

    const bookingResult = await pool.query(bookingQuery, [
      booking_id,
      customerId,
    ]);

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const booking = bookingResult.rows[0];

    if (booking.status !== "completed") {
      return res.status(400).json({
        error: "Can only review completed bookings",
      });
    }

    // Check if review already exists
    const existingReviewQuery = `
      SELECT id FROM reviews 
      WHERE booking_id = $1 AND customer_id = $2
    `;

    const existingReview = await pool.query(existingReviewQuery, [
      booking_id,
      customerId,
    ]);

    if (existingReview.rows.length > 0) {
      return res.status(400).json({
        error: "You have already reviewed this booking",
      });
    }

    // Create review 
    const insertQuery = `
      INSERT INTO reviews (booking_id, customer_id, planner_id, rating, comment, created_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      booking_id,
      customerId,
      booking.planner_id,
      rating,
      comment.trim(),
    ]);

    // Update planner's average rating
    await updatePlannerRating(booking.planner_id);

    res.status(201).json({
      message: "Review created successfully",
      review: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({ error: "Failed to create review" });
  }
});

// Update existing review
router.put(
  "/reviews/:bookingId",
  requireAuth,
  requireCustomer,
  async (req, res) => {
    try {
      const bookingId = req.params.bookingId;
      const customerId = req.session.user.id;
      const { rating, comment } = req.body;

      // Validate input
      if (!rating || !comment) {
        return res.status(400).json({
          error: "Rating and comment are required",
        });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          error: "Rating must be between 1 and 5",
        });
      }

      // Check if review exists and belongs to customer
      const checkQuery = `
      SELECT r.id, r.planner_id
      FROM reviews r
      JOIN bookings b ON r.booking_id = b.id
      WHERE r.booking_id = $1 AND r.customer_id = $2
    `;

      const checkResult = await pool.query(checkQuery, [bookingId, customerId]);

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: "Review not found" });
      }

      const existingReview = checkResult.rows[0];

      // Update review - removed updated_at column reference
      const updateQuery = `
      UPDATE reviews 
      SET rating = $1, comment = $2
      WHERE booking_id = $3 AND customer_id = $4
      RETURNING *
    `;

      const result = await pool.query(updateQuery, [
        rating,
        comment.trim(),
        bookingId,
        customerId,
      ]);

      await updatePlannerRating(existingReview.planner_id);

      res.json({
        message: "Review updated successfully",
        review: result.rows[0],
      });
    } catch (error) {
      console.error("Error updating review:", error);
      res.status(500).json({ error: "Failed to update review" });
    }
  }
);

// Delete review
router.delete(
  "/reviews/:bookingId",
  requireAuth,
  requireCustomer,
  async (req, res) => {
    try {
      const bookingId = req.params.bookingId;
      const customerId = req.session.user.id;

      // Check if review exists and belongs to customer
      const checkQuery = `
      SELECT r.id, r.planner_id
      FROM reviews r
      WHERE r.booking_id = $1 AND r.customer_id = $2
    `;

      const checkResult = await pool.query(checkQuery, [bookingId, customerId]);

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: "Review not found" });
      }

      const review = checkResult.rows[0];

      const deleteQuery = `
      DELETE FROM reviews 
      WHERE booking_id = $1 AND customer_id = $2
    `;

      await pool.query(deleteQuery, [bookingId, customerId]);

      await updatePlannerRating(review.planner_id);

      res.json({ message: "Review deleted successfully" });
    } catch (error) {
      console.error("Error deleting review:", error);
      res.status(500).json({ error: "Failed to delete review" });
    }
  }
);

// Update planner's average rating
async function updatePlannerRating(plannerId) {
  try {
    const ratingQuery = `
      SELECT 
        AVG(rating)::numeric(3,2) as average_rating,
        COUNT(*) as total_reviews
      FROM reviews 
      WHERE planner_id = $1
    `;

    const ratingResult = await pool.query(ratingQuery, [plannerId]);
    const { average_rating, total_reviews } = ratingResult.rows[0];

    const updateQuery = `
      UPDATE planners 
      SET 
        average_rating = $1,
        total_reviews = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $3
    `;

    await pool.query(updateQuery, [
      average_rating || 0,
      total_reviews || 0,
      plannerId,
    ]);
  } catch (error) {
    console.error("Error updating planner rating:", error);
  }
}

module.exports = router;
