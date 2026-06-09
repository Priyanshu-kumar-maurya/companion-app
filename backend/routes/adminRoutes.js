const express = require('express');
const { pool } = require('../config/db');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// Middleware: Only admins can access these routes
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: "Forbidden: Sirf admins hi ye route access kar sakte hain." });
    }
    next();
};

// ─── GET ALL USERS — ADMIN ONLY ───────────────────────────────
router.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await pool.query(`
            SELECT id, name, email, phone, role, kyc_status, id_proof_url, is_verified 
            FROM users 
            ORDER BY id DESC
        `);
        res.status(200).json(users.rows);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// ─── UPDATE KYC STATUS — ADMIN ONLY ──────────────────────────
router.put('/admin/kyc/:userId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;

        // Validate KYC status value
        const validStatuses = ['pending', 'verified', 'rejected', 'unverified'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: "Invalid KYC status value." });
        }

        await pool.query("UPDATE users SET kyc_status = $1 WHERE id = $2", [status, req.params.userId]);
        res.status(200).json({ message: `KYC successfully marked as ${status}` });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// ─── GET PLATFORM STATS — ADMIN ONLY ─────────────────────────
router.get('/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const totalUsers = await pool.query("SELECT COUNT(*) FROM users");
        const totalGirls = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'girl'");
        const totalBoys = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'boy'");
        const pendingKyc = await pool.query("SELECT COUNT(*) FROM users WHERE kyc_status = 'pending'");
        const totalPosts = await pool.query("SELECT COUNT(*) FROM posts");
        const totalBookings = await pool.query("SELECT COUNT(*) FROM bookings");

        res.status(200).json({
            totalUsers: parseInt(totalUsers.rows[0].count),
            girls: parseInt(totalGirls.rows[0].count),
            boys: parseInt(totalBoys.rows[0].count),
            pendingKyc: parseInt(pendingKyc.rows[0].count),
            posts: parseInt(totalPosts.rows[0].count),
            bookings: parseInt(totalBookings.rows[0].count)
        });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// ─── MAKE ADMIN — ADMIN ONLY (was completely open before!) ───
router.post('/admin/make-admin', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Email required hai." });

        const result = await pool.query("UPDATE users SET role = 'admin' WHERE email = $1 RETURNING id, name, email", [email.toLowerCase()]);

        if (result.rows.length > 0) {
            res.status(200).json({ message: `${result.rows[0].name} (${email}) ab admin ban gaya!`, user: result.rows[0] });
        } else {
            res.status(404).json({ error: `User not found with email: ${email}` });
        }
    } catch (err) {
        res.status(500).json({ error: "Error making admin" });
    }
});

// ─── DELETE ANY USER — ADMIN ONLY ────────────────────────────
router.delete('/admin/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        // Prevent admin from deleting their own account via this route
        if (parseInt(req.user.id) === parseInt(userId)) {
            return res.status(400).json({ error: "Tum apna khud ka account is route se delete nahi kar sakte." });
        }

        await pool.query("DELETE FROM posts WHERE user_id = $1", [userId]);
        await pool.query("DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1", [userId]);
        await pool.query("DELETE FROM bookings WHERE boy_id = $1 OR girl_id = $1", [userId]);
        await pool.query("DELETE FROM reviews WHERE reviewer_id = $1 OR companion_id = $1", [userId]);
        await pool.query("DELETE FROM notifications WHERE user_id = $1 OR sender_id = $1", [userId]);
        await pool.query("DELETE FROM users WHERE id = $1", [userId]);

        res.status(200).json({ message: "User deleted by admin." });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;