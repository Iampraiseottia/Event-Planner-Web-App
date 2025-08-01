const express = require("express");
const { requireAuth, requireCustomer } = require("../middleware/auth");
const Booking = require("../models/Booking");
const pool = require("../config/database");

const upload = require('../utils/fileUpload');

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
                COALESCE(SUM(CASE WHEN status = 'completed' THEN final_cost ELSE 0 END), 0) as total_spent
            FROM bookings 
            WHERE customer_id = $1
        `;

    const result = await pool.query(statsQuery, [customerId]);
    const stats = result.rows[0];

    res.json({
      totalBookings: parseInt(stats.total_bookings),
      upcomingEvents: parseInt(stats.upcoming_events),
      completedEvents: parseInt(stats.completed_events),
      totalSpent: parseFloat(stats.total_spent) || 0,
    });
  } catch (error) {
    console.error("Error loading customer stats:", error);
    res.status(500).json({ error: "Failed to load statistics" });
  }
});

// Get customer bookings
router.get("/bookings", requireAuth, requireCustomer, async (req, res) => {
  try {
    const customerId = req.session.user.id;
    const bookings = await Booking.findByCustomerId(customerId);
    res.json(bookings);
  } catch (error) {
    console.error("Error loading bookings:", error);
    res.status(500).json({ error: "Failed to load bookings" });
  }
});

// Get specific booking
router.get("/bookings/:id", requireAuth, requireCustomer, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const booking = await Booking.findById(bookingId);

    if (!booking || booking.customer_id !== req.session.user.id) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.json(booking);
  } catch (error) {
    console.error("Error loading booking:", error);
    res.status(500).json({ error: "Failed to load booking" });
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
                   u.full_name as planner_name
            FROM bookings b
            JOIN users u ON b.planner_id = u.id
            WHERE b.customer_id = $1 
            AND b.event_date > CURRENT_DATE 
            AND b.status IN ('confirmed', 'in-progress')
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
            SELECT * FROM notifications
            WHERE user_id = $1
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
            SELECT * FROM activity_logs
            WHERE user_id = $1
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
            WHERE user_id = $1 AND is_read = false
        `;

      await pool.query(query, [customerId]);
      res.json({ message: "All notifications marked as read" });
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

      const query = `DELETE FROM notifications WHERE user_id = $1`;

      await pool.query(query, [customerId]);
      res.json({ message: "All notifications cleared" });
    } catch (error) {
      console.error("Error clearing notifications:", error);
      res.status(500).json({ error: "Failed to clear notifications" });
    }
  }
);



// Upload profile image
router.post('/profile/upload-image', requireAuth, requireCustomer, upload.single('profileImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }
        
        const userId = req.session.user.id;
        const imageUrl = `/uploads/${req.file.filename}`;
        
        const query = `
            UPDATE users 
            SET profile_image = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING profile_image
        `;
        
        const result = await pool.query(query, [imageUrl, userId]);
        
        res.json({
            message: 'Profile image updated successfully',
            imageUrl: result.rows[0].profile_image
        });
    } catch (error) {
        console.error('Error uploading profile image:', error);
        res.status(500).json({ error: 'Failed to upload image' });
    }
});

module.exports = router;
