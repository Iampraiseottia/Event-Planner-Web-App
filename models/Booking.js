const pool = require("../config/database");

class Booking {
  static async create(bookingData) {
    const {
      customer_id,
      planner_id,
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
    } = bookingData;

    const query = `
    INSERT INTO bookings (
      customer_id, 
      planner_id, 
      event_type, 
      event_date, 
      event_time, 
      location, 
      category, 
      requirements,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
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
      requirements || "",
    ];

    const result = await pool.query(query, values);
    const booking = result.rows[0];

    // Create notification for planner
    await this.createNotification(
      planner_id,
      "New Booking Request",
      `New ${event_type} booking request from ${customer_name}`,
      "info",
      booking.id
    );

    // Log activity
    await this.logActivity(
      customer_id,
      "booking",
      "Booking Created",
      `Created booking for ${event_type} on ${event_date}`,
      booking.id
    );

    return booking;
  }

  // Find Existing customer By CustomerId method
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
      AND (
        b.event_date > CURRENT_DATE 
        OR (b.event_date = CURRENT_DATE AND b.event_time >= CURRENT_TIME)
        OR b.status = 'pending'
      )
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

  // UpdateStatus method

  static async updateStatus(id, status, rejectionReason = null) {
    const query = `
    UPDATE bookings 
    SET status = $2::varchar, 
        rejection_reason = $3, 
        confirmed_at = CASE WHEN $2::varchar = 'confirmed' THEN CURRENT_TIMESTAMP ELSE confirmed_at END,
        completed_at = CASE WHEN $2::varchar = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;

    const result = await pool.query(query, [
      parseInt(id),
      status,
      rejectionReason,
    ]);
    const booking = result.rows[0];

    if (booking) {
      // Create notification for customer
      const statusMessages = {
        confirmed: "Your booking has been confirmed!",
        cancelled: `Your booking has been rejected. ${rejectionReason || ""}`,
        completed: "Your event has been completed!",
      };

      await this.createNotification(
        booking.customer_id,
        "Booking Status Update",
        statusMessages[status] || `Booking status updated to ${status}`,
        status === "confirmed"
          ? "success"
          : status === "cancelled"
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

  // Get Planner by Name Method

  static async getByPlannerName(plannerName) {
    const query = `
      SELECT b.*, 
            uc.full_name as customer_name,
            uc.phone_number,
            uc.email
      FROM bookings b
      JOIN users uc ON b.customer_id = uc.id
      JOIN users up ON b.planner_id = up.id
      WHERE up.full_name = $1
      ORDER BY b.created_at DESC
    `;

    const result = await pool.query(query, [plannerName]);
    return result.rows;
  }

  static async getByDateRange(startDate, endDate) {
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
      WHERE b.event_date BETWEEN $1 AND $2
      ORDER BY b.event_date ASC, b.event_time ASC
    `;

    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  }

  static async getStats() {
    const totalQuery = `SELECT COUNT(*) as total FROM bookings`;
    const pendingQuery = `SELECT COUNT(*) as pending FROM bookings WHERE status = 'pending'`;
    const confirmedQuery = `SELECT COUNT(*) as confirmed FROM bookings WHERE status = 'confirmed'`;
    const completedQuery = `SELECT COUNT(*) as completed FROM bookings WHERE status = 'completed'`;

    const [totalResult, pendingResult, confirmedResult, completedResult] =
      await Promise.all([
        pool.query(totalQuery),
        pool.query(pendingQuery),
        pool.query(confirmedQuery),
        pool.query(completedQuery),
      ]);

    return {
      total: parseInt(totalResult.rows[0].total),
      pending: parseInt(pendingResult.rows[0].pending),
      confirmed: parseInt(confirmedResult.rows[0].confirmed),
      completed: parseInt(completedResult.rows[0].completed),
    };
  }

  static async getAll(limit = 50, offset = 0) {
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
      ORDER BY b.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  }

  static async update(id, updateData) {
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
    } = updateData;

    // Get the planner_id from planner_name
    const plannerQuery = `SELECT id FROM users WHERE full_name = $1 AND user_type = 'planner'`;
    const plannerResult = await pool.query(plannerQuery, [planner_name]);

    if (plannerResult.rows.length === 0) {
      throw new Error("Planner not found");
    }

    const planner_id = plannerResult.rows[0].id;

    const query = `
      UPDATE bookings 
      SET planner_id = $1, 
          event_type = $2, 
          category = $3, 
          location = $4, 
          event_date = $5, 
          event_time = $6, 
          requirements = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `;

    const values = [
      planner_id,
      event_type,
      category,
      location,
      event_date,
      event_time,
      requirements || "",
      id,
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const query = `DELETE FROM bookings WHERE id = $1 RETURNING *`;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = Booking;
