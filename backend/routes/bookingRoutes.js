const express = require('express');
const { pool } = require('../config/db');

const router = express.Router();

router.post('/bookings', async (req, res) => {
    try {
        const { boy_id, girl_id, hours, amount, meeting_date, meeting_time, meeting_location, meeting_details, sender_id } = req.body;
        const newBooking = await pool.query(
            "INSERT INTO bookings (boy_id, girl_id, hours, amount, meeting_date, meeting_time, meeting_location, meeting_details, sender_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
            [boy_id, girl_id, hours, amount, meeting_date, meeting_time, meeting_location, meeting_details, sender_id]
        );
        res.status(201).json(newBooking.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

router.get('/bookings/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const bookings = await pool.query(`
            SELECT b.*, 
                   boy.name as boy_name, boy.profile_pic as boy_pic,
                   girl.name as girl_name, girl.profile_pic as girl_pic
            FROM bookings b
            JOIN users boy ON b.boy_id = boy.id
            JOIN users girl ON b.girl_id = girl.id
            WHERE b.girl_id = $1 OR b.boy_id = $1
            ORDER BY b.created_at DESC
        `, [userId]);
        res.status(200).json(bookings.rows);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

router.put('/bookings/:bookingId', async (req, res) => {
    try {
        const { status } = req.body;
        const updatedBooking = await pool.query("UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *", [status, req.params.bookingId]);
        res.status(200).json(updatedBooking.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

router.post('/reviews', async (req, res) => {
    try {
        const { reviewer_id, companion_id, rating, comment } = req.body;
        const newReview = await pool.query(
            "INSERT INTO reviews (reviewer_id, companion_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *",
            [reviewer_id, companion_id, rating, comment]
        );
        res.status(201).json(newReview.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

router.get('/reviews/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const reviews = await pool.query(`
            SELECT r.*, u.name as reviewer_name, u.profile_pic as reviewer_pic
            FROM reviews r JOIN users u ON r.reviewer_id = u.id
            WHERE r.companion_id = $1 ORDER BY r.created_at DESC
        `, [userId]);
        const avgResult = await pool.query("SELECT ROUND(AVG(rating), 1) as avg_rating FROM reviews WHERE companion_id = $1", [userId]);
        res.status(200).json({
            reviews: reviews.rows,
            avgRating: avgResult.rows[0].avg_rating || 0,
            totalReviews: reviews.rows.length
        });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;