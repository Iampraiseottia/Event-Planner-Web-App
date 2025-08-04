
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
           p.base_price, p.home_address, p.average_rating, p.total_reviews
    FROM users u
    LEFT JOIN planners p ON u.id = p.user_id
    WHERE u.id = $1 AND u.deleted_at IS NULL
  `;

  const result = await pool.query(query, [id]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const user = result.rows[0];
  
  // Parse preferences if it exists and is a string
  if (user.preferences && typeof user.preferences === 'string') {
    try {
      user.preferences = JSON.parse(user.preferences);
    } catch (e) {
      console.error('Error parsing preferences for user:', id, e);
      user.preferences = [];
    }
  } else if (!user.preferences) {
    user.preferences = [];
  }
  
  return user;
}


  static async findByEmail(email) {
  const query = `
    SELECT u.*, p.business_name, p.bio, p.experience, p.specializations, 
           p.base_price, p.home_address, p.average_rating, p.total_reviews
    FROM users u
    LEFT JOIN planners p ON u.id = p.user_id
    WHERE u.email = $1 AND u.deleted_at IS NULL
  `;

  const result = await pool.query(query, [email]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const user = result.rows[0];
  
  if (user.preferences && typeof user.preferences === 'string') {
    try {
      user.preferences = JSON.parse(user.preferences);
    } catch (e) {
      console.error('Error parsing preferences for user:', email, e);
      user.preferences = [];
    }
  } else if (!user.preferences) {
    user.preferences = [];
  }
  
  return user;
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

  // Validate required fields if they're being updated
  if (email && !this.isValidEmail(email)) {
    throw new Error("Invalid email format");
  }
  
  if (phone_number && !this.isValidPhone(phone_number)) {
    throw new Error("Invalid phone number format");
  }

  // Dynamic query
  const updateFields = [];
  const values = [];
  let paramCount = 1;

  if (full_name !== undefined && full_name !== null && full_name.trim()) {
    updateFields.push(`full_name = $${paramCount}`);
    values.push(full_name.trim());
    paramCount++;
  }
  
  if (email !== undefined && email !== null && email.trim()) {
    updateFields.push(`email = $${paramCount}`);
    values.push(email.trim().toLowerCase());
    paramCount++;
  }
  
  if (phone_number !== undefined && phone_number !== null && phone_number.trim()) {
    updateFields.push(`phone_number = $${paramCount}`);
    values.push(phone_number.trim());
    paramCount++;
  }
  
  if (location !== undefined && location !== null && location.trim()) {
    updateFields.push(`location = $${paramCount}`);
    values.push(location.trim());
    paramCount++;
  }
  
   if (date_of_birth !== undefined && date_of_birth !== null && date_of_birth.trim()) {
    updateFields.push(`date_of_birth = $${paramCount}`);
    
    // Format date to ensure it's in YYYY-MM-DD format 
    const formattedDate = new Date(date_of_birth).toISOString().split('T')[0];
    values.push(formattedDate);
    paramCount++;
  }
  
  // Handle preferences properly
  if (preferences !== undefined) {
    updateFields.push(`preferences = $${paramCount}`);
    
    if (Array.isArray(preferences) && preferences.length > 0) {
      values.push(JSON.stringify(preferences));
    } else {
      values.push(null);
    }
    paramCount++;
  }

  if (updateFields.length === 0) {
    throw new Error("No valid fields to update");
  }

  updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const query = `
    UPDATE users 
    SET ${updateFields.join(', ')}
    WHERE id = $${paramCount} AND deleted_at IS NULL
    RETURNING id, full_name, email, phone_number, user_type, location, 
              date_of_birth, preferences, profile_image, created_at, updated_at
  `;

  const result = await pool.query(query, values);
  
  if (result.rows.length === 0) {
    throw new Error("User not found or update failed");
  }
  
  const updatedUser = result.rows[0];
  
  // Parse preferences in response
  if (updatedUser.preferences && typeof updatedUser.preferences === 'string') {
    try {
      updatedUser.preferences = JSON.parse(updatedUser.preferences);
    } catch (e) {
      console.error('Error parsing preferences in update response:', e);
      updatedUser.preferences = [];
    }
  } else if (!updatedUser.preferences) {
    updatedUser.preferences = [];
  }
  
  return updatedUser;
}

static isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

static isValidPhone(phone) {
  // Remove spaces, dashes, parentheses for validation
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  const phoneRegex = /^[\+]?[1-9][\d]{7,15}$/;
  return phoneRegex.test(cleanPhone);
}



// Update profile image
static async updateProfileImage(userId, imageUrl) {
  const query = `
    UPDATE users 
    SET profile_image = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2 AND deleted_at IS NULL
    RETURNING profile_image
  `;

  const result = await pool.query(query, [imageUrl, userId]);
  
  if (result.rows.length === 0) {
    throw new Error("User not found or image update failed");
  }
  
  return result.rows[0];
}



  static async updatePlannerProfile(userId, plannerData) {
    const {
      business_name,
      bio,
      experience,
      specializations,
      base_price,
      home_address,
    } = plannerData;

    const query = `
      UPDATE planners
      SET business_name = $1, bio = $2, experience = $3, 
          specializations = $4, base_price = $5, home_address = $6,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $7
      RETURNING *
    `;

    const values = [
      business_name,
      bio,
      experience,
      specializations,
      base_price,
      home_address,
      userId,
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }
}

module.exports = User;
