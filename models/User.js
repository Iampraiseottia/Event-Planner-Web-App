const bcrypt = require('bcryptjs');
const { query } = require('./database');

class User {
  // Create a new user
  static async create(userData) {
    const { full_name, email, phone_number, password, user_type = 'customer' } = userData;
    
    try {
      // Hash the password
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);
      
      const queryText = `
        INSERT INTO users (full_name, email, phone_number, password_hash, user_type)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, full_name, email, phone_number, user_type, created_at
      `;
      
      const values = [full_name, email, phone_number, password_hash, user_type];
      const result = await query(queryText, values);
      
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      const queryText = 'SELECT * FROM users WHERE email = $1';
      const result = await query(queryText, [email]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Find user by ID
  static async findById(id) {
    try {
      const queryText = 'SELECT id, full_name, email, phone_number, user_type, created_at FROM users WHERE id = $1';
      const result = await query(queryText, [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Validate password
  static async validatePassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      throw error;
    }
  }

  // Update user information
  static async update(id, userData) {
    const { full_name, email, phone_number } = userData;
    
    try {
      const queryText = `
        UPDATE users 
        SET full_name = $1, email = $2, phone_number = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING id, full_name, email, phone_number, user_type, updated_at
      `;
      
      const values = [full_name, email, phone_number, id];
      const result = await query(queryText, values);
      
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  // Get all planners
  static async getAllPlanners() {
    try {
      const queryText = `
        SELECT id, full_name, email, phone_number, created_at 
        FROM users 
        WHERE user_type = 'planner' 
        ORDER BY full_name
      `;
      const result = await query(queryText);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Delete user
  static async delete(id) {
    try {
      const queryText = 'DELETE FROM users WHERE id = $1 RETURNING id';
      const result = await query(queryText, [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }const bcrypt = require('bcryptjs');
const { query } = require('./database');

class User {
  // Create a new user
  static async create(userData) {
    const { full_name, email, phone_number, password, user_type = 'customer' } = userData;
    
    try {
      // Hash the password
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);
      
      const queryText = `
        INSERT INTO users (full_name, email, phone_number, password_hash, user_type)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, full_name, email, phone_number, user_type, created_at
      `;
      
      const values = [full_name, email, phone_number, password_hash, user_type];
      const result = await query(queryText, values);
      
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      const queryText = 'SELECT * FROM users WHERE email = $1';
      const result = await query(queryText, [email]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Find user by ID
  static async findById(id) {
    try {
      const queryText = 'SELECT id, full_name, email, phone_number, user_type, created_at FROM users WHERE id = $1';
      const result = await query(queryText, [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Validate password
  static async validatePassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      throw error;
    }
  }

  // Update user information
  static async update(id, userData) {
    const { full_name, email, phone_number } = userData;
    
    try {
      const queryText = `
        UPDATE users 
        SET full_name = $1, email = $2, phone_number = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING id, full_name, email, phone_number, user_type, updated_at
      `;
      
      const values = [full_name, email, phone_number, id];
      const result = await query(queryText, values);
      
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  // Get all planners
  static async getAllPlanners() {
    try {
      const queryText = `
        SELECT id, full_name, email, phone_number, created_at 
        FROM users 
        WHERE user_type = 'planner' 
        ORDER BY full_name
      `;
      const result = await query(queryText);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Delete user
  static async delete(id) {
    try {
      const queryText = 'DELETE FROM users WHERE id = $1 RETURNING id';
      const result = await query(queryText, [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Check if email exists
  static async emailExists(email) {
    try {
      const queryText = 'SELECT id FROM users WHERE email = $1';
      const result = await query(queryText, [email]);
      return result.rows.length > 0;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;
  }

  // Check if email exists
  static async emailExists(email) {
    try {
      const queryText = 'SELECT id FROM users WHERE email = $1';
      const result = await query(queryText, [email]);
      return result.rows.length > 0;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;