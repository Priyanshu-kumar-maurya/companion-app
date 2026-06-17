const express = require('express');
const { pool } = require('../config/db');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// ─── CREATE BOOKING — AUTH REQUIRED ──────────────────────────
router.post('/bookings', authenticateToken, async (req, res) => {
    try {
        const { boy_id, girl_id, hours, amount, meeting_date, meeting_time, meeting_location, meeting_details } = req.body;
        const sender_id = req.user.id;

        // Validate required fields
        if (!boy_id || !girl_id || !hours || !amount) {
            return res.status(400).json({ error: "boy_id, girl_id, hours, aur amount required hain." });
        }

        // Validate hours and amount are positive numbers
        if (parseInt(hours) <= 0 || parseInt(amount) <= 0) {
            return res.status(400).json({ error: "Hours aur amount positive hone chahiye." });
        }

        // Prevent booking yourself
        if (parseInt(req.user.id) === parseInt(girl_id) && parseInt(req.user.id) === parseInt(boy_id)) {
            return res.status(400).json({ error: "Tum khud ko book nahi kar sakte." });
        }

        // Validate sender is a participant
        const senderIsBoy  = parseInt(req.user.id) === parseInt(boy_id);
        const senderIsGirl = parseInt(req.user.id) === parseInt(girl_id);
        if (!senderIsBoy && !senderIsGirl) {
            return res.status(403).json({ error: "Unauthorized: Sirf participants hi booking kar sakte hain." });
        }

        const newBooking = await pool.query(
            "INSERT INTO bookings (boy_id, girl_id, hours, amount, meeting_date, meeting_time, meeting_location, meeting_details, sender_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
            [boy_id, girl_id, hours, amount, meeting_date || null, meeting_time || null, meeting_location || null, meeting_details || null, sender_id]
        );
        res.status(201).json(newBooking.rows[0]);
    } catch (err) {
        console.error('Booking error:', err);
        res.status(500).json({ error: "Server error" });
    }
});


// ─── GET BOOKINGS — AUTH REQUIRED + OWNERSHIP ────────────────
router.get('/bookings/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;

        // Users can only see their own bookings; admins can see all
        if (req.user.role !== 'admin' && parseInt(req.user.id) !== parseInt(userId)) {
            return res.status(403).json({ error: "Forbidden: Sirf apni bookings dekh sakte ho." });
        }

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

// ─── UPDATE BOOKING STATUS — AUTH REQUIRED ────────────────────
router.put('/bookings/:bookingId', authenticateToken, async (req, res) => {
    try {
        const { status } = req.body;
        const { bookingId } = req.params;

        // Validate status values
        const validStatuses = ['pending', 'accepted', 'rejected', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: "Invalid booking status." });
        }

        // Verify the booking belongs to the user
        const bookingResult = await pool.query("SELECT * FROM bookings WHERE id = $1", [bookingId]);
        if (bookingResult.rows.length === 0) return res.status(404).json({ error: "Booking nahi mili." });

        const booking = bookingResult.rows[0];
        const isParticipant = parseInt(req.user.id) === parseInt(booking.boy_id) ||
                              parseInt(req.user.id) === parseInt(booking.girl_id);

        if (req.user.role !== 'admin' && !isParticipant) {
            return res.status(403).json({ error: "Forbidden: Sirf booking participants status update kar sakte hain." });
        }

        const updatedBooking = await pool.query(
            "UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *",
            [status, bookingId]
        );
        res.status(200).json(updatedBooking.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// ─── SUBMIT REVIEW — AUTH REQUIRED ───────────────────────────
router.post('/reviews', authenticateToken, async (req, res) => {
    try {
        const { companion_id, rating, comment } = req.body;
        const reviewer_id = req.user.id; // Always use authenticated user's ID

        if (!companion_id || !rating) {
            return res.status(400).json({ error: "companion_id aur rating required hain." });
        }

        const safeRating = parseInt(rating);
        if (safeRating < 1 || safeRating > 5) {
            return res.status(400).json({ error: "Rating 1 se 5 ke beech honi chahiye." });
        }

        // Sanitize comment
        const safeComment = comment ? comment.replace(/<[^>]*>/g, '').trim().slice(0, 500) : null;

        const newReview = await pool.query(
            "INSERT INTO reviews (reviewer_id, companion_id, rating, comment) VALUES ($1, $2, $3, $4) RETURNING *",
            [reviewer_id, companion_id, safeRating, safeComment]
        );
        res.status(201).json(newReview.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// ─── GET REVIEWS — Public ─────────────────────────────────────
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