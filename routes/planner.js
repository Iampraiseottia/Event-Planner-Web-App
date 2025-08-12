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

    const statsQuery = `
      SELECT 
        COUNT(*) as total_events,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_events,
        -- Monthly earnings from confirmed and completed bookings (these are paid)
        array_agg(CASE 
          WHEN status IN ('confirmed', 'completed') 
          AND EXTRACT(MONTH FROM event_date) = EXTRACT(MONTH FROM CURRENT_DATE)
          AND EXTRACT(YEAR FROM event_date) = EXTRACT(YEAR FROM CURRENT_DATE)
          THEN category 
          ELSE NULL 
        END) as monthly_categories,
        (SELECT average_rating FROM planners WHERE user_id = $1) as average_rating
      FROM bookings b
      WHERE b.planner_id = $1 AND b.deleted_at IS NULL
    `;

    // Separate query for notifications
    const notificationQuery = `
      SELECT COUNT(*) as notification_count
      FROM notifications 
      WHERE user_id = $1 AND is_read = false AND deleted_at IS NULL
    `;

    const [statsResult, notificationResult] = await Promise.all([
      pool.query(statsQuery, [plannerId]),
      pool.query(notificationQuery, [plannerId]),
    ]);

    const stats = statsResult.rows[0];
    const notifications = notificationResult.rows[0];

    // Calculate monthly earnings from categories
    let monthlyEarnings = 0;
    if (stats.monthly_categories && Array.isArray(stats.monthly_categories)) {
      monthlyEarnings = stats.monthly_categories
        .filter((category) => category !== null)
        .reduce((sum, category) => sum + extractPriceFromCategory(category), 0);
    }

    const responseData = {
      totalEvents: parseInt(stats.total_events) || 0,
      pendingEvents: parseInt(stats.pending_events) || 0,
      monthlyEarnings: monthlyEarnings,
      averageRating: parseFloat(stats.average_rating) || 0,
      notifications: parseInt(notifications.notification_count) || 0,
    };

    console.log("Stats calculation debug:", responseData);

    res.json(responseData);
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
      const bookingId = parseInt(req.params.id);
      const booking = await Booking.findById(bookingId);

      if (!booking) {
        return res.status(404).json({
          error: "Booking not found",
        });
      }

      // Check if planner owns this booking
      if (booking.planner_id !== req.session.user.id) {
        return res.status(403).json({
          error: "You can only accept your own bookings",
        });
      }

      const updatedBooking = await Booking.updateStatus(bookingId, "confirmed");

      res.json({
        message: "Booking accepted successfully",
        booking: updatedBooking,
      });
    } catch (error) {
      console.error("Accept booking error:", error);
      res.status(500).json({
        error: "Failed to accept booking",
      });
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
      const bookingId = parseInt(req.params.id);
      const { reason } = req.body;
      const booking = await Booking.findById(bookingId);

      if (!booking) {
        return res.status(404).json({
          error: "Booking not found",
        });
      }

      if (booking.planner_id !== req.session.user.id) {
        return res.status(403).json({
          error: "You can only reject your own bookings",
        });
      }

      const updatedBooking = await Booking.updateStatus(
        bookingId,
        "cancelled",
        reason
      );

      res.json({
        message: "Booking rejected successfully",
        booking: updatedBooking,
      });
    } catch (error) {
      console.error("Reject booking error:", error);
      res.status(500).json({
        error: "Failed to reject booking",
      });
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
    const { year, month } = req.query;

    // Today's schedule query
    const todayQuery = `
      SELECT b.*, 
             u.full_name as customer_name,
             u.phone_number
      FROM bookings b
      JOIN users u ON b.customer_id = u.id
      WHERE b.planner_id = $1 
      AND b.event_date = CURRENT_DATE 
      AND b.status = 'confirmed'
      ORDER BY b.event_time ASC
    `;

    const todayResult = await pool.query(todayQuery, [plannerId]);

    // If year and month are provided, get all events for that month
    let allEvents = [];
    if (year && month) {
      const monthQuery = `
        SELECT b.*, 
               u.full_name as customer_name,
               u.phone_number
        FROM bookings b
        JOIN users u ON b.customer_id = u.id
        WHERE b.planner_id = $1 
        AND EXTRACT(YEAR FROM b.event_date) = $2
        AND EXTRACT(MONTH FROM b.event_date) = $3
        AND b.status = 'confirmed'
        ORDER BY b.event_date ASC, b.event_time ASC
      `;

      const monthResult = await pool.query(monthQuery, [
        plannerId,
        year,
        month,
      ]);
      allEvents = monthResult.rows;
    } else {
      // If no specific month requested, get upcoming events for next 3 months
      const upcomingQuery = `
        SELECT b.*, 
               u.full_name as customer_name,
               u.phone_number
        FROM bookings b
        JOIN users u ON b.customer_id = u.id
        WHERE b.planner_id = $1 
        AND b.event_date >= CURRENT_DATE 
        AND b.event_date <= CURRENT_DATE + INTERVAL '3 months'
        AND b.status = 'confirmed'
        ORDER BY b.event_date ASC, b.event_time ASC
      `;

      const upcomingResult = await pool.query(upcomingQuery, [plannerId]);
      allEvents = upcomingResult.rows;
    }

    res.json({
      today: todayResult.rows,
      allEvents: allEvents,
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

      res.json({
        message: "Profile image updated successfully",
      });
    } catch (error) {
      console.error("Error uploading profile image:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  }
);

// PUT /profile

router.put("/profile", requireAuth, requirePlanner, async (req, res) => {
  try {
    const userId = req.session.user.id;

    console.log("=== PROFILE UPDATE DEBUG ===");
    console.log("User ID from session:", userId);
    console.log("Request body:", req.body);

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

    // Validate required fields
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

    let specializationsArray = [];
    if (Array.isArray(specializations)) {
      specializationsArray = specializations.filter(
        (item) => item && item.trim() !== ""
      );
    } else if (typeof specializations === "string") {
      try {
        specializationsArray = JSON.parse(specializations);
      } catch (e) {
        specializationsArray = specializations ? [specializations] : [];
      }
    }

    console.log("Processed specializations array:", specializationsArray);

    // Check if email is already taken by another user
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1 AND id != $2",
      [email, userId]
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

      const userUpdateQuery = `
        UPDATE users 
        SET full_name = $1, email = $2, phone_number = $3, location = $4, updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *
      `;

      console.log("Updating users table with:", [
        ownerName,
        email,
        phone,
        location,
        userId,
      ]);
      const userResult = await client.query(userUpdateQuery, [
        ownerName,
        email,
        phone,
        location,
        userId,
      ]);

      console.log("User update result:", userResult.rows[0]);

      // Check if planner record exists
      const plannerCheck = await client.query(
        "SELECT * FROM planners WHERE user_id = $1",
        [userId]
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
          userId,
          businessName,
          bio,
          parseInt(experience),
          specializationsArray,
          parseFloat(basePrice),
          homeAddress || null,
        ]);

        plannerResult = await client.query(plannerInsertQuery, [
          userId,
          businessName,
          bio,
          parseInt(experience),
          specializationsArray,
          parseFloat(basePrice),
          homeAddress || null,
        ]);
      } else {
        // Update existing planner record
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
          specializationsArray,
          parseFloat(basePrice),
          homeAddress || null,
          userId,
        ]);

        plannerResult = await client.query(plannerUpdateQuery, [
          businessName,
          bio,
          parseInt(experience),
          specializationsArray,
          parseFloat(basePrice),
          homeAddress || null,
          userId,
        ]);
      }

      console.log("Planner update/insert result:", plannerResult.rows[0]);

      // Check if profile is complete
      const profileCompleteCheck = await client.query(
        `
        SELECT 
          CASE WHEN 
            id_card_data IS NOT NULL AND 
            birth_certificate_data IS NOT NULL AND
            EXISTS (SELECT 1 FROM planners WHERE user_id = $1)
          THEN TRUE ELSE FALSE END as is_complete
        FROM users WHERE id = $1
      `,
        [userId]
      );

      const isComplete = profileCompleteCheck.rows[0]?.is_complete || false;

      await client.query(
        "UPDATE users SET profile_completed = $1 WHERE id = $2",
        [isComplete, userId]
      );

      await client.query("COMMIT");

      // Update session data
      req.session.user = {
        ...req.session.user,
        full_name: userResult.rows[0].full_name,
        email: userResult.rows[0].email,
        phone_number: userResult.rows[0].phone_number,
        location: userResult.rows[0].location,
        profile_completed: isComplete,
      };

      // Get complete updated profile
      const completeProfileQuery = `
        SELECT u.*, 
               p.business_name, 
               p.bio, 
               p.experience, 
               p.specializations, 
               p.base_price, 
               p.home_address,
               p.average_rating, 
               p.total_reviews
        FROM users u
        LEFT JOIN planners p ON u.id = p.user_id
        WHERE u.id = $1
      `;

      const completeProfile = await client.query(completeProfileQuery, [
        userId,
      ]);

      console.log("Final complete profile:", completeProfile.rows[0]);

      const profileData = completeProfile.rows[0];

      if (!Array.isArray(profileData.specializations)) {
        profileData.specializations = [];
      }

      res.json({
        message: "Profile updated successfully",
        planner: profileData,
        profileComplete: isComplete,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Transaction rollback due to error:", error);
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

// profile get
router.get("/profile", requireAuth, requirePlanner, async (req, res) => {
  try {
    const userId = req.session.user.id;
    console.log(`=== FETCHING PROFILE FOR USER ${userId} ===`);

    const query = `
      SELECT u.*, 
             p.business_name, 
             p.bio, 
             p.experience, 
             p.specializations, 
             p.base_price, 
             p.home_address,
             p.average_rating, 
             p.total_reviews,
             CASE WHEN u.id_card_data IS NOT NULL THEN true ELSE false END as has_id_card,
             CASE WHEN u.birth_certificate_data IS NOT NULL THEN true ELSE false END as has_birth_certificate
      FROM users u
      LEFT JOIN planners p ON u.id = p.user_id
      WHERE u.id = $1
    `;

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Planner not found" });
    }

    const profileData = result.rows[0];
    console.log("Profile document flags:", {
      has_id_card: profileData.has_id_card,
      has_birth_certificate: profileData.has_birth_certificate,
    });

    // Ensure specializations is always an array
    if (!Array.isArray(profileData.specializations)) {
      profileData.specializations = [];
    }

    res.json({
      planner: profileData,
    });
  } catch (error) {
    console.error("Error loading profile:", error);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

// Get Profile Image
router.get("/profile/image", requireAuth, requirePlanner, async (req, res) => {
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

// Get planner clients (customers who have made bookings)
router.get("/clients", requireAuth, requirePlanner, async (req, res) => {
  try {
    const plannerId = req.session.user.id;

    const query = `
      SELECT DISTINCT
        u.id,
        u.full_name,
        u.email,
        u.phone_number,
        u.location,
        u.created_at,
        COUNT(b.id) as total_bookings,
        COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.final_cost ELSE 0 END), 0) as total_spent,
        AVG(CASE WHEN r.rating IS NOT NULL THEN r.rating ELSE NULL END) as rating,
        MAX(b.created_at) as last_booking_date
      FROM users u
      INNER JOIN bookings b ON u.id = b.customer_id
      LEFT JOIN reviews r ON b.id = r.booking_id
      WHERE b.planner_id = $1
      GROUP BY u.id, u.full_name, u.email, u.phone_number, u.location, u.created_at
      ORDER BY MAX(b.created_at) DESC
    `;

    const result = await pool.query(query, [plannerId]);

    res.json(result.rows);
  } catch (error) {
    console.error("Error loading clients:", error);
    res.status(500).json({ error: "Failed to load clients" });
  }
});

// Get client details with bookings
router.get(
  "/clients/:clientId/details",
  requireAuth,
  requirePlanner,
  async (req, res) => {
    try {
      const plannerId = req.session.user.id;
      const clientId = parseInt(req.params.clientId);

      // Get client basic info
      const clientQuery = `
      SELECT DISTINCT
        u.id,
        u.full_name,
        u.email,
        u.phone_number,
        u.location,
        u.created_at,
        COUNT(b.id) as total_bookings,
        COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.final_cost ELSE 0 END), 0) as total_spent,
        AVG(CASE WHEN r.rating IS NOT NULL THEN r.rating ELSE NULL END) as rating
      FROM users u
      INNER JOIN bookings b ON u.id = b.customer_id
      LEFT JOIN reviews r ON b.id = r.booking_id
      WHERE u.id = $1 AND b.planner_id = $2
      GROUP BY u.id, u.full_name, u.email, u.phone_number, u.location, u.created_at
    `;

      const clientResult = await pool.query(clientQuery, [clientId, plannerId]);

      if (clientResult.rows.length === 0) {
        return res.status(404).json({ error: "Client not found" });
      }

      const client = clientResult.rows[0];

      // Get client's bookings with this planner
      const bookingsQuery = `
      SELECT 
        id,
        event_type,
        event_date,
        event_time,
        location,
        status,
        final_cost,
        created_at
      FROM bookings 
      WHERE customer_id = $1 AND planner_id = $2
      ORDER BY created_at DESC
    `;

      const bookingsResult = await pool.query(bookingsQuery, [
        clientId,
        plannerId,
      ]);

      client.bookings = bookingsResult.rows;

      res.json(client);
    } catch (error) {
      console.error("Error loading client details:", error);
      res.status(500).json({ error: "Failed to load client details" });
    }
  }
);

// Blocked date
router.post("/blocked-dates", requireAuth, requirePlanner, async (req, res) => {
  try {
    const plannerId = req.session.user.id;
    const { date, reason } = req.body;

    if (!date) {
      return res.status(400).json({ error: "Date is required" });
    }

    // Check if date is already blocked
    const existingBlock = await pool.query(
      "SELECT id FROM blocked_dates WHERE planner_id = $1 AND blocked_date = $2",
      [plannerId, date]
    );

    if (existingBlock.rows.length > 0) {
      return res.status(400).json({ error: "Date is already blocked" });
    }

    const query = `
      INSERT INTO blocked_dates (planner_id, blocked_date, reason, created_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const result = await pool.query(query, [plannerId, date, reason || null]);

    res.json({
      message: "Date blocked successfully",
      blockedDate: result.rows[0],
    });
  } catch (error) {
    console.error("Error blocking date:", error);
    res.status(500).json({ error: "Failed to block date" });
  }
});

// Get blocked dates
router.get("/blocked-dates", requireAuth, requirePlanner, async (req, res) => {
  try {
    const plannerId = req.session.user.id;

    const query = `
      SELECT id, blocked_date, reason, created_at
      FROM blocked_dates
      WHERE planner_id = $1
      ORDER BY blocked_date ASC
    `;

    const result = await pool.query(query, [plannerId]);

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching blocked dates:", error);
    res.status(500).json({ error: "Failed to fetch blocked dates" });
  }
});

// Remove blocked date
router.delete(
  "/blocked-dates/:id",
  requireAuth,
  requirePlanner,
  async (req, res) => {
    try {
      const plannerId = req.session.user.id;
      const blockedDateId = parseInt(req.params.id);

      const result = await pool.query(
        "DELETE FROM blocked_dates WHERE id = $1 AND planner_id = $2 RETURNING *",
        [blockedDateId, plannerId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Blocked date not found" });
      }

      res.json({ message: "Blocked date removed successfully" });
    } catch (error) {
      console.error("Error removing blocked date:", error);
      res.status(500).json({ error: "Failed to remove blocked date" });
    }
  }
);

// Get working hours
router.get("/working-hours", requireAuth, requirePlanner, async (req, res) => {
  try {
    const plannerId = req.session.user.id;

    const query = `
      SELECT day_of_week, is_available, start_time, end_time
      FROM working_hours 
      WHERE planner_id = $1
      ORDER BY day_of_week
    `;

    const result = await pool.query(query, [plannerId]);

    // Convert to object format
    const workingHours = {};
    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    result.rows.forEach((row) => {
      const dayName = dayNames[row.day_of_week];
      workingHours[dayName] = {
        is_available: row.is_available,
        start_time: row.start_time,
        end_time: row.end_time,
      };
    });

    res.json(workingHours);
  } catch (error) {
    console.error("Error loading working hours:", error);
    res.status(500).json({ error: "Failed to load working hours" });
  }
});

// Get earnings data
router.get("/earnings", requireAuth, requirePlanner, async (req, res) => {
  try {
    const plannerId = req.session.user.id;

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

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

    // Total earnings (all confirmed and completed bookings)
    const totalEarningsQuery = `
      SELECT 
        array_agg(CASE WHEN status IN ('confirmed', 'completed') THEN category ELSE NULL END) as confirmed_categories
      FROM bookings 
      WHERE planner_id = $1 AND status IN ('confirmed', 'completed') AND deleted_at IS NULL
    `;

    // This month's earnings (confirmed and completed bookings)
    const thisMonthQuery = `
      SELECT 
        array_agg(CASE WHEN status IN ('confirmed', 'completed') THEN category ELSE NULL END) as monthly_categories
      FROM bookings 
      WHERE planner_id = $1 
      AND status IN ('confirmed', 'completed')
      AND EXTRACT(YEAR FROM event_date) = $2
      AND EXTRACT(MONTH FROM event_date) = $3
      AND deleted_at IS NULL
    `;

    // Previous month's earnings
    const previousMonthQuery = `
      SELECT 
        array_agg(CASE WHEN status IN ('confirmed', 'completed') THEN category ELSE NULL END) as previous_categories
      FROM bookings 
      WHERE planner_id = $1 
      AND status IN ('confirmed', 'completed')
      AND EXTRACT(YEAR FROM event_date) = $2
      AND EXTRACT(MONTH FROM event_date) = $3
      AND deleted_at IS NULL
    `;

    // Pending payments (only pending bookings)
    const pendingQuery = `
      SELECT 
        array_agg(CASE WHEN status = 'pending' THEN category ELSE NULL END) as pending_categories
      FROM bookings 
      WHERE planner_id = $1 
      AND status = 'pending'
      AND deleted_at IS NULL
    `;

    // Recent transactions (last 10 confirmed/completed bookings)
    const transactionsQuery = `
      SELECT b.*, u.full_name as customer_name
      FROM bookings b
      JOIN users u ON b.customer_id = u.id
      WHERE b.planner_id = $1 
      AND b.status IN ('confirmed', 'completed')
      AND b.deleted_at IS NULL
      ORDER BY b.event_date DESC
      LIMIT 10
    `;

    // Monthly trends for current year (confirmed/completed bookings)
    const trendsQuery = `
      SELECT 
        EXTRACT(YEAR FROM event_date) as year,
        EXTRACT(MONTH FROM event_date) as month,
        array_agg(CASE WHEN status IN ('confirmed', 'completed') THEN category ELSE NULL END) as trend_categories,
        COUNT(*) as bookings_count
      FROM bookings 
      WHERE planner_id = $1 
      AND status IN ('confirmed', 'completed')
      AND EXTRACT(YEAR FROM event_date) = $2
      AND deleted_at IS NULL
      GROUP BY EXTRACT(YEAR FROM event_date), EXTRACT(MONTH FROM event_date)
      ORDER BY month
    `;

    // Execute all queries
    const [
      totalResult,
      thisMonthResult,
      previousMonthResult,
      pendingResult,
      transactionsResult,
      trendsResult,
    ] = await Promise.all([
      pool.query(totalEarningsQuery, [plannerId]),
      pool.query(thisMonthQuery, [plannerId, currentYear, currentMonth]),
      pool.query(previousMonthQuery, [plannerId, previousYear, previousMonth]),
      pool.query(pendingQuery, [plannerId]),
      pool.query(transactionsQuery, [plannerId]),
      pool.query(trendsQuery, [plannerId, currentYear]),
    ]);

    // Calculate total earnings from categories
    let totalEarnings = 0;
    if (
      totalResult.rows[0].confirmed_categories &&
      Array.isArray(totalResult.rows[0].confirmed_categories)
    ) {
      totalEarnings = totalResult.rows[0].confirmed_categories
        .filter((category) => category !== null)
        .reduce((sum, category) => sum + extractPriceFromCategory(category), 0);
    }

    // Calculate this month's earnings
    let thisMonthEarnings = 0;
    if (
      thisMonthResult.rows[0].monthly_categories &&
      Array.isArray(thisMonthResult.rows[0].monthly_categories)
    ) {
      thisMonthEarnings = thisMonthResult.rows[0].monthly_categories
        .filter((category) => category !== null)
        .reduce((sum, category) => sum + extractPriceFromCategory(category), 0);
    }

    // Calculate previous month's earnings
    let previousMonthEarnings = 0;
    if (
      previousMonthResult.rows[0].previous_categories &&
      Array.isArray(previousMonthResult.rows[0].previous_categories)
    ) {
      previousMonthEarnings = previousMonthResult.rows[0].previous_categories
        .filter((category) => category !== null)
        .reduce((sum, category) => sum + extractPriceFromCategory(category), 0);
    }

    // Calculate pending payments
    let pendingPayments = 0;
    if (
      pendingResult.rows[0].pending_categories &&
      Array.isArray(pendingResult.rows[0].pending_categories)
    ) {
      pendingPayments = pendingResult.rows[0].pending_categories
        .filter((category) => category !== null)
        .reduce((sum, category) => sum + extractPriceFromCategory(category), 0);
    }

    // Calculate monthly change percentage
    let monthlyChange = 0;
    if (previousMonthEarnings > 0) {
      monthlyChange =
        ((thisMonthEarnings - previousMonthEarnings) / previousMonthEarnings) *
        100;
    } else if (thisMonthEarnings > 0) {
      monthlyChange = 100;
    }

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const monthlyTrends = trendsResult.rows.map((row) => {
      let trendEarnings = 0;
      if (row.trend_categories && Array.isArray(row.trend_categories)) {
        trendEarnings = row.trend_categories
          .filter((category) => category !== null)
          .reduce(
            (sum, category) => sum + extractPriceFromCategory(category),
            0
          );
      }

      return {
        month: monthNames[row.month - 1],
        year: parseInt(row.year),
        earnings: trendEarnings,
        bookings: parseInt(row.bookings_count) || 0,
      };
    });

    const enhancedTransactions = transactionsResult.rows.map((transaction) => ({
      ...transaction,
      calculated_amount: extractPriceFromCategory(transaction.category),
    }));

    const earningsData = {
      total: totalEarnings,
      thisMonth: thisMonthEarnings,
      previous: previousMonthEarnings,
      pending: pendingPayments,
      monthlyChange: parseFloat(monthlyChange.toFixed(1)),
      transactions: enhancedTransactions,
      monthlyTrends: monthlyTrends,
    };

    console.log("Enhanced earnings calculation:", {
      totalEarnings: earningsData.total,
      thisMonth: earningsData.thisMonth,
      pending: earningsData.pending,
      transactionCount: earningsData.transactions.length,
    });

    res.json(earningsData);
  } catch (error) {
    console.error("Error loading earnings:", error);
    res.status(500).json({ error: "Failed to load earnings data" });
  }
});

// Get planner reviews
router.get("/reviews", requireAuth, requirePlanner, async (req, res) => {
  try {
    const plannerId = req.session.user.id;

    // Iverall rating and total reviews
    const overallQuery = `
      SELECT 
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as total_reviews
      FROM reviews r
      INNER JOIN bookings b ON r.booking_id = b.id
      WHERE b.planner_id = $1 AND b.deleted_at IS NULL
    `;

    // Rating breakdown (count of each star rating)
    const breakdownQuery = `
      SELECT 
        r.rating,
        COUNT(*) as count
      FROM reviews r
      INNER JOIN bookings b ON r.booking_id = b.id
      WHERE b.planner_id = $1 AND b.deleted_at IS NULL
      GROUP BY r.rating
      ORDER BY r.rating DESC
    `;

    // Individual reviews with booking and customer details
    const reviewsQuery = `
      SELECT 
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        b.id as booking_id,
        b.event_type,
        b.event_date,
        b.location,
        b.status as booking_status,
        u.full_name as customer_name,
        u.id as customer_id
      FROM reviews r
      INNER JOIN bookings b ON r.booking_id = b.id
      INNER JOIN users u ON b.customer_id = u.id
      WHERE b.planner_id = $1 AND b.deleted_at IS NULL
      ORDER BY r.created_at DESC
    `;

    const [overallResult, breakdownResult, reviewsResult] = await Promise.all([
      pool.query(overallQuery, [plannerId]),
      pool.query(breakdownQuery, [plannerId]),
      pool.query(reviewsQuery, [plannerId]),
    ]);

    const overall = overallResult.rows[0];
    const breakdown = {};

    for (let i = 1; i <= 5; i++) {
      breakdown[i.toString()] = 0;
    }

    // Fill in actual counts
    breakdownResult.rows.forEach((row) => {
      breakdown[row.rating.toString()] = parseInt(row.count);
    });

    const responseData = {
      overall: {
        rating: parseFloat(overall.average_rating) || 0,
        total: parseInt(overall.total_reviews) || 0,
      },
      breakdown: breakdown,
      reviews: reviewsResult.rows,
    };

    res.json(responseData);
  } catch (error) {
    console.error("Error loading reviews:", error);
    res.status(500).json({ error: "Failed to load reviews" });
  }
});

// Get analytics data
router.get("/analytics", requireAuth, requirePlanner, async (req, res) => {
  try {
    const plannerId = req.session.user.id;
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    // Extract price from category
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

    // Booking trends for the last 12 months
    const bookingTrendsQuery = `
      SELECT 
        EXTRACT(YEAR FROM event_date) as year,
        EXTRACT(MONTH FROM event_date) as month,
        COUNT(*) as bookings_count,
        array_agg(CASE WHEN status IN ('confirmed', 'completed') THEN category ELSE NULL END) as revenue_categories
      FROM bookings 
      WHERE planner_id = $1 
      AND event_date >= CURRENT_DATE - INTERVAL '12 months'
      AND deleted_at IS NULL
      GROUP BY EXTRACT(YEAR FROM event_date), EXTRACT(MONTH FROM event_date)
      ORDER BY year, month
    `;

    // Event types distribution
    const eventTypesQuery = `
      SELECT 
        event_type,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
      FROM bookings 
      WHERE planner_id = $1 
      AND status IN ('confirmed', 'completed', 'pending')
      AND deleted_at IS NULL
      GROUP BY event_type
      ORDER BY count DESC
    `;

    // Client satisfaction metrics
    const satisfactionQuery = `
      SELECT 
        COUNT(r.id) as total_reviews,
        AVG(r.rating) as average_rating,
        COUNT(CASE WHEN r.rating >= 4 THEN 1 END) as satisfied_reviews,
        COUNT(DISTINCT b.customer_id) as total_clients,
        COUNT(DISTINCT CASE 
          WHEN client_bookings.booking_count > 1 THEN b.customer_id 
          ELSE NULL 
        END) as repeat_clients
      FROM bookings b
      LEFT JOIN reviews r ON b.id = r.booking_id
      LEFT JOIN (
        SELECT customer_id, COUNT(*) as booking_count
        FROM bookings 
        WHERE planner_id = $1 AND deleted_at IS NULL
        GROUP BY customer_id
      ) client_bookings ON b.customer_id = client_bookings.customer_id
      WHERE b.planner_id = $1 AND b.deleted_at IS NULL
    `;

    // Revenue growth comparison (current vs previous month)
    const revenueGrowthQuery = `
      SELECT 
        CASE 
          WHEN EXTRACT(YEAR FROM event_date) = $2 AND EXTRACT(MONTH FROM event_date) = $3 
          THEN 'current_month'
          WHEN EXTRACT(YEAR FROM event_date) = $4 AND EXTRACT(MONTH FROM event_date) = $5 
          THEN 'previous_month'
        END as period,
        array_agg(CASE WHEN status IN ('confirmed', 'completed') THEN category ELSE NULL END) as revenue_categories,
        COUNT(CASE WHEN status IN ('confirmed', 'completed') THEN 1 END) as completed_bookings
      FROM bookings 
      WHERE planner_id = $1 
      AND ((EXTRACT(YEAR FROM event_date) = $2 AND EXTRACT(MONTH FROM event_date) = $3) 
           OR (EXTRACT(YEAR FROM event_date) = $4 AND EXTRACT(MONTH FROM event_date) = $5))
      AND deleted_at IS NULL
      GROUP BY period
    `;

    // Performance insights data
    const insightsQuery = `
      SELECT 
        AVG(EXTRACT(EPOCH FROM (b.updated_at - b.created_at))/3600) as avg_response_hours,
        COUNT(CASE WHEN b.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_bookings,
        COUNT(CASE WHEN b.created_at >= CURRENT_DATE - INTERVAL '60 days' 
                   AND b.created_at < CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as previous_period_bookings
      FROM bookings b
      WHERE b.planner_id = $1 AND b.deleted_at IS NULL
    `;

    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    // Execute all queries
    const [
      trendsResult,
      eventTypesResult,
      satisfactionResult,
      revenueResult,
      insightsResult,
    ] = await Promise.all([
      pool.query(bookingTrendsQuery, [plannerId]),
      pool.query(eventTypesQuery, [plannerId]),
      pool.query(satisfactionQuery, [plannerId]),
      pool.query(revenueGrowthQuery, [
        plannerId,
        currentYear,
        currentMonth,
        previousYear,
        previousMonth,
      ]),
      pool.query(insightsQuery, [plannerId]),
    ]);

    // Process booking trends
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const bookingTrends = trendsResult.rows.map((row) => {
      let revenue = 0;
      if (row.revenue_categories && Array.isArray(row.revenue_categories)) {
        revenue = row.revenue_categories
          .filter((category) => category !== null)
          .reduce(
            (sum, category) => sum + extractPriceFromCategory(category),
            0
          );
      }

      return {
        month: monthNames[row.month - 1],
        year: parseInt(row.year),
        bookings: parseInt(row.bookings_count) || 0,
        revenue: revenue,
      };
    });

    const eventTypes = eventTypesResult.rows;

    // Process satisfaction metrics
    const satisfaction = satisfactionResult.rows[0];
    const satisfactionRate =
      satisfaction.total_reviews > 0
        ? Math.round(
            (satisfaction.satisfied_reviews / satisfaction.total_reviews) * 100
          )
        : 0;
    const repeatClientRate =
      satisfaction.total_clients > 0
        ? Math.round(
            (satisfaction.repeat_clients / satisfaction.total_clients) * 100
          )
        : 0;

    // Process revenue growth
    let currentMonthRevenue = 0;
    let previousMonthRevenue = 0;

    revenueResult.rows.forEach((row) => {
      let revenue = 0;
      if (row.revenue_categories && Array.isArray(row.revenue_categories)) {
        revenue = row.revenue_categories
          .filter((category) => category !== null)
          .reduce(
            (sum, category) => sum + extractPriceFromCategory(category),
            0
          );
      }

      if (row.period === "current_month") {
        currentMonthRevenue = revenue;
      } else if (row.period === "previous_month") {
        previousMonthRevenue = revenue;
      }
    });

    const revenueGrowthPercentage =
      previousMonthRevenue > 0
        ? Math.round(
            ((currentMonthRevenue - previousMonthRevenue) /
              previousMonthRevenue) *
              100
          )
        : currentMonthRevenue > 0
        ? 100
        : 0;

    const revenueGrowthData = bookingTrends.slice(-6);

    // Process insights
    const insights = insightsResult.rows[0];
    const bookingGrowth =
      insights.previous_period_bookings > 0
        ? Math.round(
            ((insights.recent_bookings - insights.previous_period_bookings) /
              insights.previous_period_bookings) *
              100
          )
        : insights.recent_bookings > 0
        ? 100
        : 0;

    const analyticsData = {
      bookingTrends,
      eventTypes,
      satisfaction: {
        rate: satisfactionRate,
        averageRating: parseFloat(satisfaction.average_rating) || 0,
        repeatClientRate,
      },
      revenueGrowth: {
        percentage: revenueGrowthPercentage,
        data: revenueGrowthData,
      },
      insights: {
        bookingGrowth,
        averageRating: parseFloat(satisfaction.average_rating) || 0,
        averageResponseHours: parseFloat(insights.avg_response_hours) || 0,
      },
    };

    res.json(analyticsData);
  } catch (error) {
    console.error("Error loading analytics:", error);
    res.status(500).json({ error: "Failed to load analytics data" });
  }
});

// Get recent activity for planner
router.get("/activity", requireAuth, requirePlanner, async (req, res) => {
  try {
    const plannerId = req.session.user.id;

    const activityQuery = `
      SELECT 
        'booking' as type,
        'New Booking Request' as title,
        CONCAT('New ', event_type, ' booking from ', (
          SELECT full_name FROM users WHERE id = customer_id
        )) as description,
        created_at
      FROM bookings 
      WHERE planner_id = $1 
      AND status = 'pending'
      AND created_at >= CURRENT_DATE - INTERVAL '7 days'
      AND deleted_at IS NULL
      
      UNION ALL
      
      SELECT 
        'payment' as type,
        'Payment Received' as title,
        CONCAT('Payment confirmed for ', event_type, ' - ', category) as description,
        updated_at as created_at
      FROM bookings 
      WHERE planner_id = $1 
      AND status IN ('confirmed', 'completed')
      AND updated_at >= CURRENT_DATE - INTERVAL '7 days'
      AND deleted_at IS NULL
      
      UNION ALL
      
      SELECT 
        'review' as type,
        'New Review Received' as title,
        CONCAT('New review from ', (
          SELECT u.full_name FROM users u 
          JOIN bookings b ON u.id = b.customer_id 
          WHERE b.id = r.booking_id
        ), ' - ', rating, ' stars') as description,
        r.created_at
      FROM reviews r
      JOIN bookings b ON r.booking_id = b.id
      WHERE b.planner_id = $1 
      AND r.created_at >= CURRENT_DATE - INTERVAL '7 days'
      
      ORDER BY created_at DESC
      LIMIT 10
    `;

    const result = await pool.query(activityQuery, [plannerId]);

    const activities = result.rows.map((activity) => ({
      type: activity.type,
      title: activity.title,
      description: activity.description,
      created_at: activity.created_at,
    }));

    res.json(activities);
  } catch (error) {
    console.error("Error loading recent activity:", error);

    try {
      const fallbackQuery = `
        SELECT 
          'booking' as type,
          CASE 
            WHEN status = 'pending' THEN 'Booking Request'
            WHEN status = 'confirmed' THEN 'Booking Confirmed' 
            WHEN status = 'completed' THEN 'Event Completed'
            ELSE 'Booking Update'
          END as title,
          CONCAT(event_type, ' - ', (
            SELECT full_name FROM users WHERE id = customer_id
          )) as description,
          GREATEST(created_at, updated_at) as created_at
        FROM bookings 
        WHERE planner_id = $1 
        AND GREATEST(created_at, updated_at) >= CURRENT_DATE - INTERVAL '7 days'
        AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 5
      `;

      const fallbackResult = await pool.query(fallbackQuery, [plannerId]);
      res.json(fallbackResult.rows);
    } catch (fallbackError) {
      console.error("Fallback activity query failed:", fallbackError);
      res.json([]);
    }
  }
});

// Get all notifications for planner
router.get("/notifications", requireAuth, requirePlanner, async (req, res) => {
  try {
    const plannerId = req.session.user.id;

    const columnCheckQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'notifications' AND column_name = 'priority'
    `;

    const columnCheck = await pool.query(columnCheckQuery);
    const hasPriorityColumn = columnCheck.rows.length > 0;

    const baseColumns = `
      n.id,
      n.title,
      n.message,
      n.type,
      n.is_read,
      n.created_at,
      n.updated_at
    `;

    const priorityColumn = hasPriorityColumn
      ? ", n.priority"
      : ", 'medium' as priority";
    const actionUrlColumn = `
      , CASE 
          WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notifications' AND column_name = 'action_url'
          ) THEN n.action_url 
          ELSE NULL 
        END as action_url
    `;

    const query = `
      SELECT ${baseColumns}${priorityColumn}${actionUrlColumn}
      FROM notifications n
      WHERE n.user_id = $1 
      AND (n.deleted_at IS NULL OR n.deleted_at IS NOT NULL)
      ORDER BY n.is_read ASC, n.created_at DESC
    `;

    const result = await pool.query(query, [plannerId]);

    res.json(result.rows);
  } catch (error) {
    console.error("Error loading notifications:", error);

    if (error.code === "42P01") {
      console.log("Notifications table doesn't exist, returning empty array");
      res.json([]);
      return;
    }

    try {
      const fallbackQuery = `
        SELECT 
          id,
          title,
          message,
          COALESCE(type, 'system') as type,
          'medium' as priority,
          is_read,
          NULL as action_url,
          created_at,
          COALESCE(updated_at, created_at) as updated_at
        FROM notifications 
        WHERE user_id = $1
        ORDER BY is_read ASC, created_at DESC
      `;

      const fallbackResult = await pool.query(fallbackQuery, [plannerId]);
      res.json(fallbackResult.rows);
    } catch (fallbackError) {
      console.error("Fallback notifications query failed:", fallbackError);
      res.json([]);
    }
  }
});

// Mark notification as read
router.put(
  "/notifications/:id/read",
  requireAuth,
  requirePlanner,
  async (req, res) => {
    try {
      const plannerId = req.session.user.id;
      const notificationId = parseInt(req.params.id);

      const result = await pool.query(
        `UPDATE notifications 
       SET is_read = true, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       RETURNING *`,
        [notificationId, plannerId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Notification not found" });
      }

      res.json({
        message: "Notification marked as read",
        notification: result.rows[0],
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  }
);

// Mark all notifications as read
router.put(
  "/notifications/mark-all-read",
  requireAuth,
  requirePlanner,
  async (req, res) => {
    try {
      const plannerId = req.session.user.id;

      const result = await pool.query(
        `UPDATE notifications 
       SET is_read = true, updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = $1 AND is_read = false AND deleted_at IS NULL`,
        [plannerId]
      );

      res.json({
        message: "All notifications marked as read",
        count: result.rowCount,
      });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res
        .status(500)
        .json({ error: "Failed to mark all notifications as read" });
    }
  }
);

// Delete notification
router.delete(
  "/notifications/:id",
  requireAuth,
  requirePlanner,
  async (req, res) => {
    try {
      const plannerId = req.session.user.id;
      const notificationId = parseInt(req.params.id);

      const result = await pool.query(
        `UPDATE notifications 
       SET deleted_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       RETURNING id`,
        [notificationId, plannerId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Notification not found" });
      }

      res.json({ message: "Notification deleted successfully" });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ error: "Failed to delete notification" });
    }
  }
);

// Clear all notifications
router.delete(
  "/notifications/clear-all",
  requireAuth,
  requirePlanner,
  async (req, res) => {
    try {
      const plannerId = req.session.user.id;

      const result = await pool.query(
        `UPDATE notifications 
       SET deleted_at = CURRENT_TIMESTAMP 
       WHERE user_id = $1 AND deleted_at IS NULL`,
        [plannerId]
      );

      res.json({
        message: "All notifications cleared",
        count: result.rowCount,
      });
    } catch (error) {
      console.error("Error clearing notifications:", error);
      res.status(500).json({ error: "Failed to clear notifications" });
    }
  }
);

// Create notification
async function createNotification(
  userId,
  title,
  message,
  type = "system",
  priority = "medium",
  actionUrl = null
) {
  try {
    const query = `
      INSERT INTO notifications (user_id, title, message, type, priority, action_url, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const result = await pool.query(query, [
      userId,
      title,
      message,
      type,
      priority,
      actionUrl,
    ]);
    return result.rows[0];
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}

// Upload ID card
router.post(
  "/profile/upload-id-card",
  requireAuth,
  requirePlanner,

  upload.single("idCard"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const userId = req.session.user.id;
      const fileBuffer = req.file.buffer;
      const mimeType = req.file.mimetype;

      const query = `
        UPDATE users 
        SET id_card_data = $1, id_card_mime_type = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING id
      `;

      const result = await pool.query(query, [fileBuffer, mimeType, userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        message: "ID card uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading ID card:", error);
      res.status(500).json({ error: "Failed to upload ID card" });
    }
  }
);

// Upload birth certificate
router.post(
  "/profile/upload-birth-certificate",
  requireAuth,
  requirePlanner,
  upload.single("birthCertificate"),
  async (req, res) => {
    try {
      console.log("=== BIRTH CERTIFICATE UPLOAD ===");
      console.log("Request file:", req.file ? "Present" : "Missing");

      if (!req.file) {
        console.log("No file in request");
        return res.status(400).json({ error: "No file provided" });
      }

      const userId = req.session.user.id;
      const fileBuffer = req.file.buffer;
      const mimeType = req.file.mimetype;

      console.log("User ID:", userId);
      console.log("File info:", {
        originalname: req.file.originalname,
        mimetype: mimeType,
        size: fileBuffer.length,
      });

      const query = `
        UPDATE users 
        SET birth_certificate_data = $1, 
            birth_certificate_mime_type = $2, 
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING id
      `;

      const result = await pool.query(query, [fileBuffer, mimeType, userId]);
      console.log(
        "Update result:",
        result.rows.length > 0 ? "Success" : "Failed"
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      console.log("Birth certificate uploaded successfully for user", userId);

      res.json({
        message: "Birth certificate uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading birth certificate:", error);
      res.status(500).json({
        error: "Failed to upload birth certificate",
        details: error.message,
      });
    }
  }
);

// Get ID card
router.get(
  "/profile/id-card",
  requireAuth,
  requirePlanner,
  async (req, res) => {
    try {
      const userId = req.session.user.id;

      const query = `
      SELECT id_card_data, id_card_mime_type FROM users WHERE id = $1
    `;

      const result = await pool.query(query, [userId]);
      const user = result.rows[0];

      if (!user || !user.id_card_data) {
        return res.status(404).json({ error: "ID card not found" });
      }

      res.set("Content-Type", user.id_card_mime_type);
      res.send(user.id_card_data);
    } catch (error) {
      console.error("Error getting ID card:", error);
      res.status(500).json({ error: "Failed to retrieve ID card" });
    }
  }
);

// Get birth certificate
router.get(
  "/profile/birth-certificate",
  requireAuth,
  requirePlanner,
  async (req, res) => {
    try {
      const userId = req.session.user.id;
      console.log(`=== FETCHING BIRTH CERTIFICATE FOR USER ${userId} ===`);

      const query = `
        SELECT birth_certificate_data, birth_certificate_mime_type 
        FROM users 
        WHERE id = $1
      `;

      const result = await pool.query(query, [userId]);
      console.log("Query result rows:", result.rows.length);

      const user = result.rows[0];

      if (!user) {
        console.log("User not found");
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.birth_certificate_data) {
        console.log("Birth certificate data not found for user", userId);
        return res.status(404).json({ error: "Birth certificate not found" });
      }

      console.log(
        "Birth certificate found, MIME type:",
        user.birth_certificate_mime_type
      );
      console.log("Data size:", user.birth_certificate_data.length);

      // Set appropriate headers
      res.set({
        "Content-Type":
          user.birth_certificate_mime_type || "application/octet-stream",
        "Content-Length": user.birth_certificate_data.length,
        "Cache-Control": "private, max-age=3600",
      });

      res.send(user.birth_certificate_data);
    } catch (error) {
      console.error("Error getting birth certificate:", error);
      res.status(500).json({ error: "Failed to retrieve birth certificate" });
    }
  }
);

module.exports = router;
