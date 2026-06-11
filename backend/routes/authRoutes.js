const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
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
        if (!name || !name.trim()) return res.status(400).json({ error: "Name is required." });
        if (!validateEmail(email)) return res.status(400).json({ error: "Please enter a valid email address." });
        if (!validatePassword(password)) return res.status(400).json({ error: "Password must be at least 6 characters." });
        if (!role || !['boy', 'girl'].includes(role)) return res.status(400).json({ error: "Please select a valid role (boy/girl)." });

        // Check if email already exists
        const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: "This email is already registered. Please login." });
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

        res.status(201).json({ message: "Registration successful!", token, user });
    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ error: "Server error. Please try again." });
    }
});


// ─── LOGIN ───────────────────────────────────────────────────
router.post('/login', authRateLimit, async (req, res) => {
    try {
        // Support both 'email' and 'emailOrPhone' field names from frontend
        const emailOrPhone = req.body.email || req.body.emailOrPhone;
        const { password } = req.body;

        if (!emailOrPhone) return res.status(400).json({ error: "Please enter your email or phone number." });
        if (!password) return res.status(400).json({ error: "Please enter your password." });

        // Find user by email OR phone
        const userResult = await pool.query(
            "SELECT * FROM users WHERE email = $1 OR phone = $1",
            [emailOrPhone.toLowerCase().trim()]
        );
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: "Incorrect email/phone or password." });
        }

        const user = userResult.rows[0];

        // Verify password — supports both bcrypt hashed AND old plain-text passwords
        let isPasswordValid = false;
        if (user.password && user.password.startsWith('$2')) {
            // bcrypt hashed password
            isPasswordValid = await bcrypt.compare(password, user.password);
        } else {
            // Old plain-text password (legacy users)
            isPasswordValid = (password === user.password);
            if (isPasswordValid) {
                // Auto-upgrade to bcrypt on successful login
                const hashed = await bcrypt.hash(password, 12);
                await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hashed, user.id]);
            }
        }

        if (!isPasswordValid) {
            return res.status(401).json({ error: "Incorrect email/phone or password." });
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
        res.status(500).json({ error: "Server error. Please try again." });
    }
});

// ─── FORGOT PASSWORD (Send OTP) ───────────────────────────────
router.post('/forgot-password', authRateLimit, async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !validateEmail(email)) {
            return res.status(400).json({ error: "Please enter a valid email address." });
        }

        const userResult = await pool.query(
            "SELECT id, name FROM users WHERE email = $1",
            [email.toLowerCase().trim()]
        );
        if (userResult.rows.length === 0) {
            return res.status(200).json({ message: "If this email is registered, an OTP has been sent." });
        }

        const user = userResult.rows[0];
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        await pool.query(
            "UPDATE users SET otp = $1, otp_expiry = $2 WHERE id = $3",
            [otp, otpExpiry, user.id]
        );

        const resend = new Resend(process.env.RESEND_API_KEY);

        await resend.emails.send({
            from: 'RentGF <onboarding@resend.dev>',
            to: [email],
            subject: 'RentGF — Password Reset Code',
            html: `
                <!DOCTYPE html>
                <html>
                <body style="margin:0;padding:0;background:#f4f4f4;font-family:'Segoe UI',Arial,sans-serif;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
                        <tr><td align="center">
                            <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">
                                <tr><td style="background:linear-gradient(135deg,#e91e8c,#ff6b6b);padding:36px 40px;text-align:center;">
                                    <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;">RentGF</h1>
                                    <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Password Reset</p>
                                </td></tr>
                                <tr><td style="padding:40px;">
                                    <p style="margin:0 0 16px;color:#333;font-size:16px;">Hi <strong>${user.name}</strong>,</p>
                                    <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">You requested a password reset. Use the OTP below. This code expires in <strong>10 minutes</strong>.</p>
                                    <div style="background:linear-gradient(135deg,#fff0f6,#ffe4f0);border:2px solid #f48fb1;border-radius:12px;padding:28px;text-align:center;margin-bottom:24px;">
                                        <p style="margin:0 0 8px;color:#c2185b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:2px;">Reset OTP</p>
                                        <p style="margin:0;color:#e91e8c;font-size:48px;font-weight:900;letter-spacing:12px;font-family:'Courier New',monospace;">${otp}</p>
                                    </div>
                                    <p style="margin:0;color:#aaa;font-size:12px;text-align:center;">If you did not request this, please ignore this email.</p>
                                </td></tr>
                                <tr><td style="background:#fafafa;padding:20px 40px;border-top:1px solid #eee;text-align:center;">
                                    <p style="margin:0;color:#bbb;font-size:12px;">&copy; 2024 RentGF &middot; All rights reserved</p>
                                </td></tr>
                            </table>
                        </td></tr>
                    </table>
                </body>
                </html>
            `
        });

        res.status(200).json({ message: "OTP sent successfully! Please check your email." });
    } catch (err) {
        console.error("Forgot password error — Full details:", err.message, err);
        res.status(500).json({ error: "Failed to send OTP. Please try again." });
    }
});

// ─── RESET PASSWORD ───────────────────────────────────────────
router.post('/reset-password', authRateLimit, async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !validateEmail(email)) return res.status(400).json({ error: "Please enter a valid email." });
        if (!otp) return res.status(400).json({ error: "Please enter the OTP." });
        if (!newPassword || newPassword.length < 5) return res.status(400).json({ error: "New password must be at least 5 characters." });

        const userResult = await pool.query(
            "SELECT id, otp, otp_expiry FROM users WHERE email = $1",
            [email.toLowerCase().trim()]
        );
        if (userResult.rows.length === 0) return res.status(404).json({ error: "Account not found." });

        const user = userResult.rows[0];

        if (!user.otp) return res.status(400).json({ error: "Please request an OTP first." });
        if (new Date() > new Date(user.otp_expiry)) return res.status(400).json({ error: "OTP has expired. Please request a new one." });
        if (user.otp !== otp.toString()) return res.status(400).json({ error: "Incorrect OTP. Please try again." });

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await pool.query(
            "UPDATE users SET password = $1, otp = NULL, otp_expiry = NULL WHERE id = $2",
            [hashedPassword, user.id]
        );

        res.status(200).json({ message: "Password reset successfully! Please login with your new password." });
    } catch (err) {
        console.error("Reset password error:", err);
        res.status(500).json({ error: "Failed to reset password. Please try again." });
    }
});


// ─── SEND OTP ────────────────────────────────────────────────
router.post('/send-otp', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !validateEmail(email)) {
            return res.status(400).json({ error: "Valid email dalo." });
        }

        // Find user by email
        const userResult = await pool.query("SELECT id, name FROM users WHERE email = $1", [email.toLowerCase()]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: "Is email se koi account nahi mila." });
        }

        const user = userResult.rows[0];

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

        // Store OTP and expiry in DB
        await pool.query(
            "UPDATE users SET otp = $1, otp_expiry = $2 WHERE id = $3",
            [otp, otpExpiry, user.id]
        );

        // Configure nodemailer transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // HTML email template
        const mailOptions = {
            from: `"RentGF" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your RentGF Verification Code',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin:0; padding:0; background-color:#f4f4f4; font-family: 'Segoe UI', Arial, sans-serif;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4; padding: 40px 0;">
                        <tr>
                            <td align="center">
                                <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.10);">
                                    <!-- Header -->
                                    <tr>
                                        <td style="background: linear-gradient(135deg, #e91e8c, #ff6b6b); padding: 36px 40px; text-align:center;">
                                            <h1 style="margin:0; color:#ffffff; font-size:28px; font-weight:700; letter-spacing:1px;">💕 RentGF</h1>
                                            <p style="margin:8px 0 0; color:rgba(255,255,255,0.85); font-size:14px;">Email Verification</p>
                                        </td>
                                    </tr>
                                    <!-- Body -->
                                    <tr>
                                        <td style="padding: 40px 40px 32px;">
                                            <p style="margin:0 0 16px; color:#333333; font-size:16px;">Hi <strong>${user.name}</strong>,</p>
                                            <p style="margin:0 0 28px; color:#555555; font-size:15px; line-height:1.6;">Use the verification code below to complete your sign-in. This code is valid for <strong>10 minutes</strong>.</p>
                                            <!-- OTP Box -->
                                            <div style="background: linear-gradient(135deg, #fff0f6, #ffe4f0); border: 2px solid #f48fb1; border-radius:12px; padding: 28px; text-align:center; margin-bottom:28px;">
                                                <p style="margin:0 0 8px; color:#c2185b; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:2px;">Your OTP Code</p>
                                                <p style="margin:0; color:#e91e8c; font-size:48px; font-weight:900; letter-spacing:12px; font-family: 'Courier New', monospace;">${otp}</p>
                                            </div>
                                            <p style="margin:0 0 8px; color:#888888; font-size:13px; text-align:center;">⏱️ This code expires in <strong>10 minutes</strong>.</p>
                                            <p style="margin:0; color:#aaaaaa; font-size:12px; text-align:center;">If you didn't request this, please ignore this email.</p>
                                        </td>
                                    </tr>
                                    <!-- Footer -->
                                    <tr>
                                        <td style="background:#fafafa; padding: 20px 40px; border-top: 1px solid #eeeeee; text-align:center;">
                                            <p style="margin:0; color:#bbbbbb; font-size:12px;">© 2024 RentGF · All rights reserved</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: "OTP sent successfully! Email check karo. 📧" });
    } catch (err) {
        console.error("Send OTP error:", err);
        res.status(500).json({ error: "OTP send karne mein error. Dobara try karo." });
    }
});

// ─── VERIFY OTP ──────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !validateEmail(email)) {
            return res.status(400).json({ error: "Valid email dalo." });
        }
        if (!otp) {
            return res.status(400).json({ error: "OTP dalo." });
        }

        // Find user by email
        const userResult = await pool.query(
            "SELECT id, name, email, role, otp, otp_expiry FROM users WHERE email = $1",
            [email.toLowerCase()]
        );
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: "Is email se koi account nahi mila." });
        }

        const user = userResult.rows[0];

        // Check OTP exists
        if (!user.otp) {
            return res.status(400).json({ error: "Pehle OTP request karo." });
        }

        // Check OTP not expired
        if (new Date() > new Date(user.otp_expiry)) {
            return res.status(400).json({ error: "OTP expire ho gaya. Naya OTP request karo." });
        }

        // Check OTP matches
        if (user.otp !== otp.toString()) {
            return res.status(400).json({ error: "Galat OTP hai. Dobara check karo." });
        }

        // Mark verified and clear OTP fields
        await pool.query(
            "UPDATE users SET is_verified = true, otp = NULL, otp_expiry = NULL WHERE id = $1",
            [user.id]
        );

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(200).json({
            message: "Email verified! Welcome to RentGF 🎉",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error("Verify OTP error:", err);
        res.status(500).json({ error: "OTP verify karne mein error. Dobara try karo." });
    }
});

module.exports = router;
