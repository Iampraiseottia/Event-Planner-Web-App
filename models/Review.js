const pool = require('../config/database');

class Review {
    static async create(reviewData) {
        const { booking_id, customer_id, planner_id, rating, comment } = reviewData;
        
        const query = `
            INSERT INTO reviews (booking_id, customer_id, planner_id, rating, comment)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        
        const result = await pool.query(query, [booking_id, customer_id, planner_id, rating, comment]);
        
        // Update planner's average rating
        await this.updatePlannerRating(planner_id);
        
        return result.rows[0];
    }
    
    static async findByPlannerId(plannerId) {
        const query = `
            SELECT r.*, u.full_name as customer_name, b.event_type, b.event_date
            FROM reviews r
            JOIN users u ON r.customer_id = u.id
            JOIN bookings b ON r.booking_id = b.id
            WHERE r.planner_id = $1
            ORDER BY r.created_at DESC
        `;
        
        const result = await pool.query(query, [plannerId]);
        return result.rows;
    }
    
    static async updatePlannerRating(plannerId) {
        const ratingQuery = `
            SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews
            FROM reviews
            WHERE planner_id = $1
        `;
        
        const ratingResult = await pool.query(ratingQuery, [plannerId]);
        const { avg_rating, total_reviews } = ratingResult.rows[0];
        
        const updateQuery = `
            UPDATE planners 
            SET average_rating = $1, total_reviews = $2
            WHERE user_id = $3
        `;
        
        await pool.query(updateQuery, [avg_rating || 0, total_reviews || 0, plannerId]);
    }
    
    static async getRatingBreakdown(plannerId) {
        const query = `
            SELECT 
                rating,
                COUNT(*) as count
            FROM reviews
            WHERE planner_id = $1
            GROUP BY rating
            ORDER BY rating DESC
        `;
        
        const result = await pool.query(query, [plannerId]);
        
        // Convert to object format
        const breakdown = {};
        result.rows.forEach(row => {
            breakdown[row.rating] = parseInt(row.count);
        });
        
        return breakdown;
    }
}

module.exports = Review;