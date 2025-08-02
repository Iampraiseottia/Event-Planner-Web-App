// route/planner.js
const express = require("express");
const {
  requireAuth,
  requirePlanner,
  requireCustomer,
} = require("../middleware/auth");
const Booking = require("../models/Booking");
const pool = require("../config/database");

const upload = require("../utils/fileUpload");

const router = express.Router();

// Get planner statistics
router.get("/stats", requireAuth, requirePlanner, async (req, res) => {
  try {
    const plannerId = req.session.user.id;

    const statsQuery = `
            SELECT 
                COUNT(*) as total_events,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_events,
                COALESCE(SUM(CASE WHEN status = 'completed' AND EXTRACT(MONTH FROM completed_at) = EXTRACT(MONTH FROM CURRENT_DATE) THEN final_cost ELSE 0 END), 0) as monthly_earnings,
                (SELECT average_rating FROM planners WHERE user_id = $1) as average_rating,
                COUNT(CASE WHEN is_read = false THEN 1 END) as notifications
            FROM bookings b
            LEFT JOIN notifications n ON n.user_id = $1
            WHERE b.planner_id = $1
        `;

    const result = await pool.query(statsQuery, [plannerId]);
    const stats = result.rows[0];

    res.json({
      totalEvents: parseInt(stats.total_events),
      pendingEvents: parseInt(stats.pending_events),
      monthlyEarnings: parseFloat(stats.monthly_earnings) || 0,
      averageRating: parseFloat(stats.average_rating) || 0,
      notifications: parseInt(stats.notifications) || 0,
    });
  } catch (error) {
    console.error("Error loading planner stats:", error);
    res.status(500).json({ error: "Failed to load statistics" });
  }
});

// Get planner bookings
router.get("/bookings", requireAuth, requirePlanner, async (req, res) => {
  try {
    const plannerId = req.session.user.id;
    const bookings = await Booking.findByPlannerId(plannerId);
    res.json(bookings);
  } catch (error) {
    console.error("Error loading bookings:", error);
    res.status(500).json({ error: "Failed to load bookings" });
  }
});

// Accept booking
router.post(
  "/bookings/:id/accept",
  requireAuth,
  requirePlanner,
  async (req, res) => {
    try {
      const bookingId = req.params.id;
      const plannerId = req.session.user.id;

      // Verify booking belongs to planner
      const booking = await Booking.findById(bookingId);
      if (!booking || booking.planner_id !== plannerId) {
        return res.status(404).json({ error: "Booking not found" });
      }

      if (booking.status !== "pending") {
        return res.status(400).json({ error: "Booking is not pending" });
      }

      const updatedBooking = await Booking.updateStatus(bookingId, "confirmed");
      res.json({
        message: "Booking accepted successfully",
        booking: updatedBooking,
      });
    } catch (error) {
      console.error("Error accepting booking:", error);
      res.status(500).json({ error: "Failed to accept booking" });
    }
  }
);

// Reject booking
router.post(
  "/bookings/:id/reject",
  requireAuth,
  requirePlanner,
  async (req, res) => {
    try {
      const bookingId = req.params.id;
      const plannerId = req.session.user.id;
      const { reason } = req.body;

      // Verify booking belongs to planner
      const booking = await Booking.findById(bookingId);
      if (!booking || booking.planner_id !== plannerId) {
        return res.status(404).json({ error: "Booking not found" });
      }

      if (booking.status !== "pending") {
        return res.status(400).json({ error: "Booking is not pending" });
      }

      const updatedBooking = await Booking.updateStatus(
        bookingId,
        "rejected",
        reason
      );
      res.json({ message: "Booking rejected", booking: updatedBooking });
    } catch (error) {
      console.error("Error rejecting booking:", error);
      res.status(500).json({ error: "Failed to reject booking" });
    }
  }
);

// Get upcoming events
router.get(
  "/upcoming-events",
  requireAuth,
  requirePlanner,
  async (req, res) => {
    try {
      const plannerId = req.session.user.id;

      const query = `
            SELECT b.*, 
                   u.full_name as customer_name
            FROM bookings b
            JOIN users u ON b.customer_id = u.id
            WHERE b.planner_id = $1 
            AND b.event_date >= CURRENT_DATE 
            AND b.status IN ('confirmed', 'in-progress')
            ORDER BY b.event_date ASC
            LIMIT 5
        `;

      const result = await pool.query(query, [plannerId]);
      res.json(result.rows);
    } catch (error) {
      console.error("Error loading upcoming events:", error);
      res.status(500).json({ error: "Failed to load upcoming events" });
    }
  }
);

// Get schedule
router.get("/schedule", requireAuth, requirePlanner, async (req, res) => {
  try {
    const plannerId = req.session.user.id;

    const todayQuery = `
            SELECT b.*, 
                   u.full_name as customer_name
            FROM bookings b
            JOIN users u ON b.customer_id = u.id
            WHERE b.planner_id = $1 
            AND b.event_date = CURRENT_DATE 
            AND b.status IN ('confirmed', 'in-progress')
            ORDER BY b.event_time ASC
        `;

    const result = await pool.query(todayQuery, [plannerId]);

    res.json({
      today: result.rows,
    });
  } catch (error) {
    console.error("Error loading schedule:", error);
    res.status(500).json({ error: "Failed to load schedule" });
  }
});

// Update working hours
router.put("/working-hours", requireAuth, requirePlanner, async (req, res) => {
  try {
    const plannerId = req.session.user.id;
    const { workingHours } = req.body;

    await pool.query("DELETE FROM working_hours WHERE planner_id = $1", [
      plannerId,
    ]);

    // Insert new working hours
    const days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      const dayData = workingHours[day];

      if (dayData && dayData.enabled) {
        const query = `
                    INSERT INTO working_hours (planner_id, day_of_week, is_available, start_time, end_time)
                    VALUES ($1, $2, $3, $4, $5)
                `;

        await pool.query(query, [
          plannerId,
          i,
          true,
          dayData.start,
          dayData.end,
        ]);
      }
    }

    res.json({ message: "Working hours updated successfully" });
  } catch (error) {
    console.error("Error updating working hours:", error);
    res.status(500).json({ error: "Failed to update working hours" });
  }
});

// Upload profile image 
router.post(
  "/profile/upload-image",
  requireAuth,
  requirePlanner,
  upload.single("profileImage"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
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
        message: "Profile image updated successfully",
        imageUrl: result.rows[0].profile_image,
      });
    } catch (error) {
      console.error("Error uploading profile image:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  }
);


router.put("/profile", requireAuth, requirePlanner, async (req, res) => {
  try {
    const plannerId = req.session.user.id;
    
    console.log("=== PROFILE UPDATE DEBUG ===");
    console.log("Planner ID from session:", plannerId);
    console.log("Request body:", req.body);
    console.log("Session user:", req.session.user);
    
    const {
      businessName,
      ownerName,
      email,
      phone,
      location,
      homeAddress,
      specializations,
      bio,
      basePrice,
      experience,
    } = req.body;

    if (
      !businessName ||
      !ownerName ||
      !email ||
      !phone ||
      !location ||
      !bio ||
      !basePrice ||
      !experience
    ) {
      console.log("Validation failed - missing fields");
      return res.status(400).json({
        error: "All required fields must be filled",
      });
    }

    // Check if email is already taken by another user
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1 AND id != $2",
      [email, plannerId]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        error: "Email is already taken by another user",
      });
    }

    // Start transaction
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Update users table
      const userUpdateQuery = `
        UPDATE users 
        SET full_name = $1, email = $2, phone_number = $3, location = $4, updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *
      `;

      console.log("Updating users table with:", [ownerName, email, phone, location, plannerId]);
      const userResult = await client.query(userUpdateQuery, [
        ownerName,
        email,
        phone,
        location,
        plannerId,
      ]);
      
      console.log("User update result:", userResult.rows[0]);

      // First check if planner record exists
      const plannerCheck = await client.query(
        "SELECT * FROM planners WHERE user_id = $1",
        [plannerId]
      );
      
      console.log("Existing planner record:", plannerCheck.rows[0]);

      let plannerResult;
      if (plannerCheck.rows.length === 0) {
        // Create planner record if it doesn't exist
        const plannerInsertQuery = `
          INSERT INTO planners (user_id, business_name, bio, experience, specializations, base_price, home_address)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;
        
        console.log("Creating new planner record with:", [
          plannerId,
          businessName,
          bio,
          parseInt(experience),
          JSON.stringify(specializations),
          parseFloat(basePrice),
          homeAddress
        ]);
        
        plannerResult = await client.query(plannerInsertQuery, [
          plannerId,
          businessName,
          bio,
          parseInt(experience),
          JSON.stringify(specializations),
          parseFloat(basePrice),
          homeAddress,
        ]);
      } else {
        const plannerUpdateQuery = `
          UPDATE planners 
          SET business_name = $1, bio = $2, experience = $3, specializations = $4, 
              base_price = $5, home_address = $6, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $7
          RETURNING *
        `;

        console.log("Updating planner record with:", [
          businessName,
          bio,
          parseInt(experience),
          JSON.stringify(specializations),
          parseFloat(basePrice),
          homeAddress,
          plannerId
        ]);

        plannerResult = await client.query(plannerUpdateQuery, [
          businessName,
          bio,
          parseInt(experience),
          JSON.stringify(specializations),
          parseFloat(basePrice),
          homeAddress,
          plannerId,
        ]);
      }

      console.log("Planner update/insert result:", plannerResult.rows[0]);

      await client.query("COMMIT");

      // Update session data
      req.session.user = {
        ...req.session.user,
        full_name: userResult.rows[0].full_name,
        email: userResult.rows[0].email,
        phone_number: userResult.rows[0].phone_number,
        location: userResult.rows[0].location,
      };

      // Get complete updated profile
      const completeProfileQuery = `
        SELECT u.*, p.business_name, p.bio, p.experience, p.specializations, 
               p.base_price, p.home_address, p.average_rating, p.total_reviews
        FROM users u
        LEFT JOIN planners p ON u.id = p.user_id
        WHERE u.id = $1
      `;

      const completeProfile = await client.query(completeProfileQuery, [
        plannerId,
      ]);

      console.log("Final complete profile:", completeProfile.rows[0]);

      res.json({
        message: "Profile updated successfully",
        planner: completeProfile.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.log("Transaction rollback due to error:", error);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({
      error: error.message || "Profile update failed",
    });
  }
});


module.exports = router;
