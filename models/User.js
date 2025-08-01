const pool = require("../config/database");
const bcrypt = require("bcryptjs");

class User {
  static async create(userData) {
    const {
      full_name,
      email,
      phone_number,
      password,
      user_type,
      location,
      date_of_birth,
      preferences,
    } = userData;

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const query = `
            INSERT INTO users (full_name, email, phone_number, password_hash, user_type, location, date_of_birth, preferences)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, full_name, email, phone_number, user_type, location, date_of_birth, preferences, created_at
        `;

    const values = [
      full_name,
      email,
      phone_number,
      password_hash,
      user_type,
      location,
      date_of_birth,
      preferences,
    ];
    const result = await pool.query(query, values);

    if (user_type === "planner") {
      await this.createPlannerProfile(result.rows[0].id);
    }

    return result.rows[0];
  }

  static async createPlannerProfile(userId) {
    const query = `
            INSERT INTO planners (user_id)
            VALUES ($1)
            RETURNING *
        `;

    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
            SELECT u.*, p.business_name, p.bio, p.experience, p.specializations, 
                   p.base_price, p.website, p.average_rating, p.total_reviews
            FROM users u
            LEFT JOIN planners p ON u.id = p.user_id
            WHERE u.id = $1
        `;

    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = `
            SELECT u.*, p.business_name, p.bio, p.experience, p.specializations, 
                   p.base_price, p.website, p.average_rating, p.total_reviews
            FROM users u
            LEFT JOIN planners p ON u.id = p.user_id
            WHERE u.email = $1
        `;

    const result = await pool.query(query, [email]);
    return result.rows[0];
  }

  static async validatePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  static async update(id, userData) {
    const {
      full_name,
      email,
      phone_number,
      location,
      date_of_birth,
      preferences,
    } = userData;

    const query = `
            UPDATE users 
            SET full_name = $1, email = $2, phone_number = $3, location = $4, 
                date_of_birth = $5, preferences = $6, updated_at = CURRENT_TIMESTAMP
            WHERE id = $7
            RETURNING *
        `;

    const values = [
      full_name,
      email,
      phone_number,
      location,
      date_of_birth,
      preferences,
      id,
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }
}

module.exports = User;
