const pool = require("../config/database");

class Booking {
  static async create(bookingData) {
    const {
      customer_id,
      planner_id,
      event_type,
      event_date,
      event_time,
      location,
      category,
      requirements,
      estimated_cost,
    } = bookingData;

    const query = `
            INSERT INTO bookings (customer_id, planner_id, event_type, event_date, event_time, location, category, requirements, estimated_cost)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;

    const values = [
      customer_id,
      planner_id,
      event_type,
      event_date,
      event_time,
      location,
      category,
      requirements,
      estimated_cost,
    ];
    const result = await pool.query(query, values);

    // Create notification for planner
    await this.createNotification(
      planner_id,
      "New Booking Request",
      `New ${event_type} booking request from customer`,
      "info",
      result.rows[0].id
    );

    // Log activity
    await this.logActivity(
      customer_id,
      "booking",
      "Booking Created",
      `Created booking for ${event_type}`,
      result.rows[0].id
    );

    return result.rows[0];
  }

  static async findByCustomerId(customerId) {
    const query = `
            SELECT b.*, 
                   u.full_name as planner_name, 
                   u.phone_number as planner_phone,
                   u.email as planner_email,
                   uc.full_name as customer_name,
                   uc.phone_number,
                   uc.email
            FROM bookings b
            JOIN users u ON b.planner_id = u.id
            JOIN users uc ON b.customer_id = uc.id
            WHERE b.customer_id = $1
            ORDER BY b.created_at DESC
        `;

    const result = await pool.query(query, [customerId]);
    return result.rows;
  }

  static async findByPlannerId(plannerId) {
    const query = `
            SELECT b.*, 
                   u.full_name as customer_name, 
                   u.phone_number,
                   u.email
            FROM bookings b
            JOIN users u ON b.customer_id = u.id
            WHERE b.planner_id = $1
            ORDER BY b.created_at DESC
        `;

    const result = await pool.query(query, [plannerId]);
    return result.rows;
  }

  static async findById(id) {
    const query = `
            SELECT b.*, 
                   up.full_name as planner_name, 
                   up.phone_number as planner_phone,
                   up.email as planner_email,
                   uc.full_name as customer_name,
                   uc.phone_number,
                   uc.email
            FROM bookings b
            JOIN users up ON b.planner_id = up.id
            JOIN users uc ON b.customer_id = uc.id
            WHERE b.id = $1
        `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async updateStatus(id, status, rejectionReason = null) {
    const query = `
            UPDATE bookings 
            SET status = $1, rejection_reason = $2, 
                confirmed_at = CASE WHEN $1 = 'confirmed' THEN CURRENT_TIMESTAMP ELSE confirmed_at END,
                completed_at = CASE WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *
        `;

    const result = await pool.query(query, [status, rejectionReason, id]);
    const booking = result.rows[0];

    if (booking) {
      // Create notification for customer
      const statusMessages = {
        confirmed: "Your booking has been confirmed!",
        rejected: `Your booking has been rejected. ${rejectionReason || ""}`,
        completed: "Your event has been completed!",
        cancelled: "Your booking has been cancelled.",
      };

      await this.createNotification(
        booking.customer_id,
        "Booking Status Update",
        statusMessages[status] || `Booking status updated to ${status}`,
        status === "confirmed"
          ? "success"
          : status === "rejected"
          ? "error"
          : "info",
        booking.id
      );

      // Log activity
      await this.logActivity(
        booking.planner_id,
        "booking",
        "Booking Status Updated",
        `Updated booking status to ${status}`,
        booking.id
      );
    }

    return booking;
  }

  static async createNotification(
    userId,
    title,
    message,
    type,
    bookingId = null
  ) {
    const query = `
            INSERT INTO notifications (user_id, title, message, type, related_booking_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

    const result = await pool.query(query, [
      userId,
      title,
      message,
      type,
      bookingId,
    ]);
    return result.rows[0];
  }

  static async logActivity(userId, type, title, description, bookingId = null) {
    const query = `
            INSERT INTO activity_logs (user_id, type, title, description, related_booking_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

    const result = await pool.query(query, [
      userId,
      type,
      title,
      description,
      bookingId,
    ]);
    return result.rows[0];
  }
}

module.exports = Booking;
