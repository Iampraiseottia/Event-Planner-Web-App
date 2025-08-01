const pool = require('../config/database');

class Notification {
    static async create(notificationData) {
        const { user_id, title, message, type, related_booking_id } = notificationData;
        
        const query = `
            INSERT INTO notifications (user_id, title, message, type, related_booking_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        
        const result = await pool.query(query, [user_id, title, message, type, related_booking_id]);
        return result.rows[0];
    }
    
    static async findByUserId(userId, limit = 50) {
        const query = `
            SELECT * FROM notifications
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2
        `;
        
        const result = await pool.query(query, [userId, limit]);
        return result.rows;
    }
    
    static async markAsRead(id) {
        const query = `
            UPDATE notifications 
            SET is_read = true 
            WHERE id = $1
            RETURNING *
        `;
        
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }
    
    static async markAllAsRead(userId) {
        const query = `
            UPDATE notifications 
            SET is_read = true 
            WHERE user_id = $1 AND is_read = false
        `;
        
        await pool.query(query, [userId]);
        return true;
    }
    
    static async deleteAll(userId) {
        const query = `DELETE FROM notifications WHERE user_id = $1`;
        await pool.query(query, [userId]);
        return true;
    }
}

module.exports = Notification;