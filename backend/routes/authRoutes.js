const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const rateLimiter = require('../middleware/rateLimiter');

const router = express.Router();

// Strict rate limiter for auth routes — 5 attempts per minute per IP
const authRateLimit = rateLimiter(5, 60 * 1000);

// Input validation helper
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePassword = (password) => password && password.length >= 6;

// ─── REGISTER ───────────────────────────────────────────────
router.post('/register', authRateLimit, async (req, res) => {
    try {
        const { name, email, password, role, phone } = req.body;

        // Input validation
        if (!name || !name.trim()) return res.status(400).json({ error: "Name required hai." });
        if (!validateEmail(email)) return res.status(400).json({ error: "Valid email address dalo." });
        if (!validatePassword(password)) return res.status(400).json({ error: "Password kam se kam 6 characters ka hona chahiye." });
        if (!role || !['boy', 'girl'].includes(role)) return res.status(400).json({ error: "Valid role select karo (boy/girl)." });

        // Check if email already exists
        const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: "Ye email already registered hai. Login karo." });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const newUser = await pool.query(
            "INSERT INTO users (name, email, password, role, phone) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role",
            [name.trim(), email.toLowerCase(), hashedPassword, role, phone || null]
        );

        const user = newUser.rows[0];
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({ message: "Registration successful! 🎉", token, user });
    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ error: "Server error. Dobara try karo." });
    }
});

// ─── LOGIN ───────────────────────────────────────────────────
router.post('/login', authRateLimit, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Input validation
        if (!validateEmail(email)) return res.status(400).json({ error: "Valid email dalo." });
        if (!password) return res.status(400).json({ error: "Password dalo." });

        // Find user
        const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
        if (userResult.rows.length === 0) {
            // Generic message to prevent user enumeration
            return res.status(401).json({ error: "Email ya password galat hai." });
        }

        const user = userResult.rows[0];

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Email ya password galat hai." });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(200).json({
            message: "Login successful!",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                profile_pic: user.profile_pic,
                kyc_status: user.kyc_status
            }
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Server error. Dobara try karo." });
    }
});

module.exports = router;
