const express = require('express');
const { pool } = require('../config/db');

const router = express.Router();

router.get('/admin/users', async (req, res) => {
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

router.put('/admin/kyc/:userId', async (req, res) => {
    try {
        const { status } = req.body;
        await pool.query("UPDATE users SET kyc_status = $1 WHERE id = $2", [status, req.params.userId]);
        res.status(200).json({ message: `KYC successfully marked as ${status}` });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

router.get('/admin/stats', async (req, res) => {
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

router.get('/make-admin/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const result = await pool.query("UPDATE users SET role = 'admin' WHERE email = $1 RETURNING *", [email]);

        if (result.rows.length > 0) {
            res.status(200).send(`<h1>🔥 Badaai ho Boss! ${email} ab SUPER ADMIN ban chuka hai.</h1> <p>Ab app mein dobara login karo.</p>`);
        } else {
            res.status(404).send(`User not found with email: ${email}`);
        }
    } catch (err) {
        res.status(500).send("Error making admin");
    }
});

module.exports = router;