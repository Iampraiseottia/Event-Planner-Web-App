// routes/booking.js
const express = require("express");
const Booking = require("../models/Booking");
const pool = require("../config/database");
const {
  requireAuth,
  requireCustomer,
  requirePlanner,
} = require("../middleware/auth");

const router = express.Router();

const getPlannerByName = async (plannerName) => {
  try {
    const query = `
      SELECT id, full_name, email, phone_number 
      FROM users 
      WHERE full_name = $1 AND user_type = 'planner' AND is_active = true
    `;
    const result = await pool.query(query, [plannerName]);
    console.log(`Looking for planner: ${plannerName}, found:`, result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error("Error getting planner by name:", error);
    return null;
  }
};

router.get("/planners", async (req, res) => {
  try {
    console.log("Fetching planners from database...");

    const query = `
      SELECT 
        id, 
        full_name, 
        email, 
        phone_number
      FROM users 
      WHERE user_type = 'planner' 
        AND is_active = true 
      ORDER BY full_name ASC
    `;

    const result = await pool.query(query);

    console.log(`Found ${result.rows.length} planners in database`);
    console.log("Planners data:", result.rows);

    res.status(200).json({
      success: true,
      planners: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error("Get planners error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to retrieve planners from database",
      message: error.message,
      planners: [],
    });
  }
});

// Create a new booking (customers only)
router.post("/", requireAuth, async (req, res) => {
  try {
    const {
      planner_name,
      customer_name,
      phone_number,
      email,
      event_type,
      category,
      location,
      event_date,
      event_time,
      requirements,
    } = req.body;

    console.log("Booking request data:", req.body);

    // Validate required fields
    if (
      !planner_name ||
      !customer_name ||
      !phone_number ||
      !email ||
      !event_type ||
      !category ||
      !location ||
      !event_date ||
      !event_time
    ) {
      return res.status(400).json({
        error: "All required fields must be filled",
      });
    }

    // Validate date is not in the past
    const eventDate = new Date(event_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (eventDate < today) {
      return res.status(400).json({
        error: "Event date cannot be in the past",
      });
    }

    // Get planner details
    const planner = await getPlannerByName(planner_name);
    if (!planner) {
      console.error(`Planner not found: ${planner_name}`);
      return res.status(400).json({
        error: `Selected planner "${planner_name}" not found. Please refresh the page and try again.`,
      });
    }

    console.log("Found planner:", planner);

    const bookingData = {
      customer_id: req.session.user.id,
      planner_id: planner.id,
      planner_name: planner.full_name,
      customer_name,
      phone_number,
      email,
      event_type,
      category,
      location,
      event_date,
      event_time,
      requirements: requirements || "",
    };

    console.log("Creating booking with data:", bookingData);

    const booking = await Booking.create(bookingData);

    res.status(201).json({
      message: "Booking created successfully",
      booking: booking,
    });
  } catch (error) {
    console.error("Booking creation error:", error);
    res.status(500).json({
      error: "Failed to create booking. Please try again.",
      details: error.message,
    });
  }
});

// Get specific booking by ID
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        error: "Booking not found",
      });
    }

    // Check if user has permission to view this booking
    if (
      req.session.user.user_type === "customer" &&
      booking.customer_id !== req.session.user.id
    ) {
      return res.status(403).json({
        error: "Unauthorized access to this booking",
      });
    }

    if (
      req.session.user.user_type === "planner" &&
      booking.planner_name !== req.session.user.full_name
    ) {
      return res.status(403).json({
        error: "Unauthorized access to this booking",
      });
    }

    res.json({ booking });
  } catch (error) {
    console.error("Get booking error:", error);
    res.status(500).json({
      error: "Failed to retrieve booking",
    });
  }
});

// Update booking status (planners only)
router.patch("/:id/status", requireAuth, async (req, res) => {
  try {
    if (req.session.user.user_type !== "planner") {
      return res.status(403).json({
        error: "Only planners can update booking status",
      });
    }

    const bookingId = req.params.id;
    const { status } = req.body;

    // Validate status
    const validStatuses = ["pending", "confirmed", "cancelled", "completed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: "Invalid status. Must be one of: " + validStatuses.join(", "),
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        error: "Booking not found",
      });
    }

    // Check if planner owns this booking
    if (booking.planner_name !== req.session.user.full_name) {
      return res.status(403).json({
        error: "You can only update your own bookings",
      });
    }

    const updatedBooking = await Booking.updateStatus(bookingId, status);

    res.json({
      message: "Booking status updated successfully",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Update booking status error:", error);
    res.status(500).json({
      error: "Failed to update booking status",
    });
  }
});

// Booking details 
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        error: "Booking not found",
      });
    }

    // Check permissions
    if (req.session.user.user_type === "customer") {
      if (booking.customer_id !== req.session.user.id) {
        return res.status(403).json({
          error: "You can only update your own bookings",
        });
      }

      if (booking.status !== "pending") {
        return res.status(400).json({
          error: "You can only update pending bookings",
        });
      }
    }

    const {
      planner_name,
      customer_name,
      phone_number,
      email,
      event_type,
      category,
      location,
      event_date,
      event_time,
      requirements,
    } = req.body;

    // Validate required fields
    if (
      !planner_name ||
      !customer_name ||
      !phone_number ||
      !email ||
      !event_type ||
      !category ||
      !location ||
      !event_date ||
      !event_time
    ) {
      return res.status(400).json({
        error: "All required fields must be filled",
      });
    }

    // Validate date is not in the past
    const eventDate = new Date(event_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (eventDate < today) {
      return res.status(400).json({
        error: "Event date cannot be in the past",
      });
    }

    const updateData = {
      planner_name,
      customer_name,
      phone_number,
      email,
      event_type,
      category,
      location,
      event_date,
      event_time,
      requirements: requirements || "",
    };

    const updatedBooking = await Booking.update(bookingId, updateData);

    res.json({
      message: "Booking updated successfully",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Update booking error:", error);
    res.status(500).json({
      error: "Failed to update booking",
    });
  }
});

// Delete booking
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        error: "Booking not found",
      });
    }

    // Check permissions
    if (req.session.user.user_type === "customer") {
      if (booking.customer_id !== req.session.user.id) {
        return res.status(403).json({
          error: "You can only delete your own bookings",
        });
      }

      if (booking.status !== "pending") {
        return res.status(400).json({
          error: "You can only delete pending bookings",
        });
      }
    } else if (req.session.user.user_type === "planner") {
      if (booking.planner_name !== req.session.user.full_name) {
        return res.status(403).json({
          error: "You can only delete your own bookings",
        });
      }
    }

    await Booking.delete(bookingId);

    res.json({
      message: "Booking deleted successfully",
    });
  } catch (error) {
    console.error("Delete booking error:", error);
    res.status(500).json({
      error: "Failed to delete booking",
    });
  }
});

// Get bookings by date range (planners only)
router.get(
  "/date-range/:startDate/:endDate",
  requirePlanner,
  async (req, res) => {
    try {
      const { startDate, endDate } = req.params;

      // Validate dates
      if (!Date.parse(startDate) || !Date.parse(endDate)) {
        return res.status(400).json({
          error: "Invalid date format. Use YYYY-MM-DD",
        });
      }

      const bookings = await Booking.getByDateRange(startDate, endDate);

      res.json({
        bookings: bookings,
        dateRange: {
          start: startDate,
          end: endDate,
        },
      });
    } catch (error) {
      console.error("Get bookings by date range error:", error);
      res.status(500).json({
        error: "Failed to retrieve bookings",
      });
    }
  }
);

// Get booking statistics (planners only)
router.get("/stats/overview", requirePlanner, async (req, res) => {
  try {
    const stats = await Booking.getStats();

    res.json({
      statistics: stats,
    });
  } catch (error) {
    console.error("Get booking stats error:", error);
    res.status(500).json({
      error: "Failed to retrieve booking statistics",
    });
  }
});

// Get user's bookings
router.get("/my-bookings", requireAuth, async (req, res) => {
  try {
    let bookings;

    if (req.session.user.user_type === "customer") {
      // Customer sees their own bookings
      bookings = await Booking.findByCustomerId(req.session.user.id);
    } else if (req.session.user.user_type === "planner") {
      // Planner sees bookings assigned to them
      bookings = await Booking.findByPlannerId(req.session.user.id);
    } else {
      return res.status(403).json({
        error: "Unauthorized access",
      });
    }

    res.json({
      bookings: bookings,
    });
  } catch (error) {
    console.error("Get user's bookings error:", error);
    res.status(500).json({
      error: "Failed to retrieve bookings",
    });
  }
});


// Get all bookings (admin/planner view with pagination)
router.get("/all", requireAuth, async (req, res) => {
  try {
    // Only planners can see all bookings
    if (req.session.user.user_type !== "planner") {
      return res.status(403).json({
        error: "Unauthorized access",
      });
    }

    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const bookings = await Booking.getAll(limit, offset);

    res.json({
      bookings: bookings,
      pagination: {
        limit,
        offset,
        total: bookings.length,
      },
    });
  } catch (error) {
    console.error("Get all bookings error:", error);
    res.status(500).json({
      error: "Failed to retrieve bookings",
    });
  }
});

module.exports = router;
