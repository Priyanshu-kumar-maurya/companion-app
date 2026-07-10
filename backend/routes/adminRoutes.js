const express = require('express');
const { pool } = require('../config/db');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// Middleware: Only admins can access these routes
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: "Forbidden: Admins only." });
    }
    next();
};

// ─── GET ALL USERS — ADMIN ONLY ───────────────────────────────
router.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await pool.query(`
            SELECT u.id, u.name, u.email, u.phone, u.role, u.kyc_status, u.id_proof_url,
                   u.is_verified, u.is_frozen, u.is_platform_blocked,
                   u.profile_pic, u.city, u.created_at, u.bio, u.price, u.tags, u.dob, u.age,
                   COALESCE((SELECT COUNT(*) FROM reports WHERE reported_id = u.id), 0) as report_count
            FROM users u
            ORDER BY u.id DESC
        `);
        console.log(`✅ Admin users fetched: ${users.rows.length} users`);
        res.status(200).json(users.rows);
    } catch (err) {
        console.error('❌ Admin /admin/users error:', err.message, err.stack);
        res.status(500).json({ error: "Server error fetching users", details: err.message });
    }
});

// ─── UPDATE KYC STATUS — ADMIN ONLY ──────────────────────────
router.put('/admin/kyc/:userId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'verified', 'rejected', 'unverified'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: "Invalid KYC status value." });
        }
        await pool.query("UPDATE users SET kyc_status = $1 WHERE id = $2", [status, req.params.userId]);
        res.status(200).json({ message: `KYC marked as ${status}` });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// ─── FREEZE / UNFREEZE ACCOUNT — ADMIN ONLY ──────────────────
router.put('/admin/users/:userId/freeze', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { freeze } = req.body; // true = freeze, false = unfreeze

        if (parseInt(req.user.id) === parseInt(userId)) {
            return res.status(400).json({ error: "You cannot freeze your own account." });
        }

        await pool.query("UPDATE users SET is_frozen = $1 WHERE id = $2", [!!freeze, userId]);
        res.status(200).json({ message: freeze ? "Account frozen." : "Account unfrozen." });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// ─── PLATFORM BLOCK / UNBLOCK — ADMIN ONLY ───────────────────
router.put('/admin/users/:userId/platform-block', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { block } = req.body; // true = block, false = unblock

        if (parseInt(req.user.id) === parseInt(userId)) {
            return res.status(400).json({ error: "You cannot block your own account." });
        }

        await pool.query("UPDATE users SET is_platform_blocked = $1 WHERE id = $2", [!!block, userId]);
        res.status(200).json({ message: block ? "User platform-blocked." : "User platform-unblocked." });
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
        const pendingReports = await pool.query("SELECT COUNT(*) FROM reports WHERE status = 'pending'");
        const frozenUsers = await pool.query("SELECT COUNT(*) FROM users WHERE is_frozen = true");

        res.status(200).json({
            totalUsers: parseInt(totalUsers.rows[0].count),
            girls: parseInt(totalGirls.rows[0].count),
            boys: parseInt(totalBoys.rows[0].count),
            pendingKyc: parseInt(pendingKyc.rows[0].count),
            posts: parseInt(totalPosts.rows[0].count),
            bookings: parseInt(totalBookings.rows[0].count),
            pendingReports: parseInt(pendingReports.rows[0].count),
            frozenUsers: parseInt(frozenUsers.rows[0].count),
        });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// ─── GET ALL REPORTS — ADMIN ONLY ────────────────────────────
router.get('/admin/reports', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const reports = await pool.query(`
            SELECT r.id, r.reason, r.description, r.status, r.created_at,
                   rep.id as reporter_id, rep.name as reporter_name, rep.profile_pic as reporter_pic,
                   rep2.id as reported_id, rep2.name as reported_name, rep2.profile_pic as reported_pic, rep2.role as reported_role
            FROM reports r
            LEFT JOIN users rep ON r.reporter_id = rep.id
            LEFT JOIN users rep2 ON r.reported_id = rep2.id
            ORDER BY r.created_at DESC
        `);
        res.status(200).json(reports.rows);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// ─── UPDATE REPORT STATUS — ADMIN ONLY ───────────────────────
router.put('/admin/reports/:reportId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { reportId } = req.params;
        const { status } = req.body;
        const validStatuses = ['pending', 'reviewed', 'dismissed'];
        if (!validStatuses.includes(status)) return res.status(400).json({ error: "Invalid status." });

        await pool.query("UPDATE reports SET status = $1 WHERE id = $2", [status, reportId]);
        res.status(200).json({ message: `Report marked as ${status}.` });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// ─── MAKE ADMIN — ADMIN ONLY ──────────────────────────────────
router.post('/admin/make-admin', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Email required." });
        const result = await pool.query("UPDATE users SET role = 'admin' WHERE email = $1 RETURNING id, name, email", [email.toLowerCase()]);
        if (result.rows.length > 0) {
            res.status(200).json({ message: `${result.rows[0].name} is now an admin!`, user: result.rows[0] });
        } else {
            res.status(404).json({ error: `User not found: ${email}` });
        }
    } catch (err) {
        res.status(500).json({ error: "Error making admin" });
    }
});

// ─── DELETE ANY USER — ADMIN ONLY ────────────────────────────
router.delete('/admin/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        if (parseInt(req.user.id) === parseInt(userId)) {
            return res.status(400).json({ error: "You cannot delete your own account via this route." });
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