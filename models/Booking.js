const { query } = require("./database");

class Booking {
  // Create a new booking
  static async create(bookingData) {
    const {
      customer_id,
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

    try {
      const queryText = `
        INSERT INTO bookings (
          customer_id, planner_name, customer_name, phone_number,
          email, event_type, category, location, event_date,
          event_time, requirements, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const values = [
        customer_id,
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
        "pending",
      ];

      const result = await query(queryText, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Find bookings by customer ID
  static async findByCustomerId(customer_id) {
    try {
      const queryText = `
        SELECT * FROM bookings 
        WHERE customer_id = $1 
        ORDER BY created_at DESC
      `;
      const result = await query(queryText, [customer_id]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Find booking by ID
  static async findById(id) {
    try {
      const queryText = "SELECT * FROM bookings WHERE id = $1";
      const result = await query(queryText, [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get all bookings (for admin/planner view)
  static async getAll(limit = 50, offset = 0) {
    try {
      const queryText = `
        SELECT b.*, u.full_name as customer_full_name 
        FROM bookings b
        LEFT JOIN users u ON b.customer_id = u.id
        ORDER BY b.created_at DESC
        LIMIT $1 OFFSET $2
      `;
      const result = await query(queryText, [limit, offset]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get bookings by planner name
  static async getByPlannerName(planner_name) {
    try {
      const queryText = `
        SELECT b.*, u.full_name as customer_full_name 
        FROM bookings b
        LEFT JOIN users u ON b.customer_id = u.id
        WHERE b.planner_name = $1
        ORDER BY b.created_at DESC
      `;
      const result = await query(queryText, [planner_name]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Update booking status
  static async updateStatus(id, status) {
    try {
      const queryText = `
        UPDATE bookings 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      const result = await query(queryText, [status, id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Update booking details
  static async update(id, bookingData) {
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
    } = bookingData;

    try {
      const queryText = `
        UPDATE bookings 
        SET planner_name = $1, customer_name = $2, phone_number = $3,
            email = $4, event_type = $5, category = $6, location = $7,
            event_date = $8, event_time = $9, requirements = $10,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $11
        RETURNING *
      `;

      const values = [
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
        id,
      ];

      const result = await query(queryText, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Delete booking
  static async delete(id) {
    try {
      const queryText = "DELETE FROM bookings WHERE id = $1 RETURNING id";
      const result = await query(queryText, [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get bookings by date range
  static async getByDateRange(startDate, endDate) {
    try {
      const queryText = `
        SELECT b.*, u.full_name as customer_full_name 
        FROM bookings b
        LEFT JOIN users u ON b.customer_id = u.id
        WHERE b.event_date BETWEEN $1 AND $2
        ORDER BY b.event_date ASC
      `;
      const result = await query(queryText, [startDate, endDate]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get booking statistics
  static async getStats() {
    try {
      const queryText = `
        SELECT 
          COUNT(*) as total_bookings,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bookings,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_bookings,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings
        FROM bookings
      `;
      const result = await query(queryText);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Booking;
