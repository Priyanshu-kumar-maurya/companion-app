const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'rentgf_uploads',
        allowed_formats: ['jpg', 'jpeg', 'png', 'mp4', 'mov'],
        resource_type: 'auto'
    }
});

const upload = multer({ storage: storage });
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: "postgresql://neondb_owner:npg_8VKzyms7OMvw@ep-twilight-sun-a1oynkx0.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
    ssl: {
        rejectUnauthorized: false
    }
});

pool.connect()
    .then(async () => {
        console.log(' PostgreSQL Connected Successfully');
        try {
            await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;");
            await pool.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url TEXT;");
            await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(20) DEFAULT 'unverified';");
            await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS id_proof_url TEXT;");
            await pool.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_for INTEGER[] DEFAULT '{}';");
            await pool.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;");
            await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);");
            await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;");
            await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS otp VARCHAR(10);");
            await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expiry TIMESTAMP;");
            await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS sender_id INTEGER;");

            await pool.query(`CREATE TABLE IF NOT EXISTS bookings (
                id SERIAL PRIMARY KEY,
                boy_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                girl_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                hours INTEGER NOT NULL,
                amount INTEGER NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );`);

            await pool.query(`CREATE TABLE IF NOT EXISTS likes (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, post_id)
            );`);

            await pool.query(`CREATE TABLE IF NOT EXISTS comments (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
                text TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );`);

            await pool.query(`CREATE TABLE IF NOT EXISTS follows (
                id SERIAL PRIMARY KEY,
                follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                following_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(follower_id, following_id)
            );`);

            await pool.query(`CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                type VARCHAR(20) NOT NULL,
                post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
                is_read BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );`);

            await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS meeting_date DATE;");
            await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS meeting_time TIME;");
            await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS meeting_location TEXT;");
            await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS meeting_details TEXT;");

            await pool.query(`CREATE TABLE IF NOT EXISTS reviews (
                id SERIAL PRIMARY KEY,
                reviewer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                companion_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                rating INTEGER CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );`);

            console.log(' Database Auto-Fixed: Tables ready!');
        } catch (e) {
            console.log('Column check warning:', e.message);
        }
    })
    .catch((err) => console.error('❌ Database connection error:', err.stack));

const onlineUsers = new Map();

io.on("connection", (socket) => {
    socket.on("user_connected", (userId) => {
        onlineUsers.set(userId.toString(), socket.id);
        io.emit("update_online_users", Array.from(onlineUsers.keys()));
    });

    socket.on("join_own_room", (userId) => {
        socket.join(`user_${userId}`);
    });

    socket.on("join_room", (room) => {
        socket.join(room);
    });

    socket.on("send_message", async (data) => {
        try {
            const result = await pool.query(
                "INSERT INTO messages (sender_id, receiver_id, text, image_url) VALUES ($1, $2, $3, $4) RETURNING id, created_at, is_read",
                [data.sender_id, data.receiver_id, data.text || data.message || "", data.image_url || null]
            );
            const savedMessage = result.rows[0];
            data.id = savedMessage.id;
            data.created_at = savedMessage.created_at;
            data.is_read = savedMessage.is_read;
            io.to(data.room).emit("receive_message", data);
            if (data.receiver_id) {
                socket.to(data.receiver_id.toString()).emit("receive_message", data);
            }
        } catch (err) { }
    });

    socket.on("mark_messages_read", async (data) => {
        try {
            await pool.query("UPDATE messages SET is_read = true WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false", [data.sender_id, data.receiver_id]);
            io.to(data.room).emit("messages_read_update", data);
        } catch (error) { }
    });

    socket.on("initiate_call", (data) => {
        socket.to(data.room).emit("incoming_call", { type: data.type, caller_id: socket.id });
    });

    socket.on("accept_call", (data) => {
        socket.to(data.room).emit("call_accepted");
    });

    socket.on("reject_call", (data) => {
        socket.to(data.room).emit("call_rejected");
    });

    socket.on("end_call", (data) => {
        socket.to(data.room).emit("call_ended");
    });

    socket.on("edit_message", async (data) => {
        try {
            await pool.query("UPDATE messages SET text = $1 WHERE id = $2 AND sender_id = $3", [data.newText, data.messageId, data.sender_id]);
            io.to(data.room).emit("message_edited", { messageId: data.messageId, newText: data.newText });
        } catch (error) { }
    });

    socket.on("webrtc_offer", (data) => {
        socket.to(data.room).emit("webrtc_offer", data.offer);
    });

    socket.on("webrtc_answer", (data) => {
        socket.to(data.room).emit("webrtc_answer", data.answer);
    });

    socket.on("webrtc_ice_candidate", (data) => {
        socket.to(data.room).emit("webrtc_ice_candidate", data.candidate);
    });

    socket.on("delete_message", async (data) => {
        try {
            await pool.query("DELETE FROM messages WHERE id = $1 AND sender_id = $2", [data.messageId, data.sender_id]);
            io.to(data.room).emit("message_deleted", data.messageId);
        } catch (error) { }
    });

    socket.on("delete_for_me", async (data) => {
        try {
            await pool.query("UPDATE messages SET deleted_for = array_append(deleted_for, $1) WHERE id = $2", [data.userId, data.messageId]);
        } catch (error) { }
    });

    socket.on("send_booking_notification", (data) => {
        socket.to(`user_${data.receiver_id}`).emit("receive_booking_notification", data);
    });

    socket.on("disconnect", () => {
        let disconnectedUserId = null;
        for (let [userId, socketId] of onlineUsers.entries()) {
            if (socketId === socket.id) {
                disconnectedUserId = userId;
                onlineUsers.delete(userId);
                break;
            }
        }
        if (disconnectedUserId) {
            io.emit("update_online_users", Array.from(onlineUsers.keys()));
        }
    });
});

app.get('/', (req, res) => {
    res.send('Dating App Backend with PostgreSQL & Socket.io is running!');
});

app.post('/api/kyc/:userId', upload.single('id_document'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Koi document upload nahi hua!" });
        const { userId } = req.params;
        const documentUrl = req.file.path;
        const updatedUser = await pool.query(
            "UPDATE users SET id_proof_url = $1, kyc_status = 'pending' WHERE id = $2 RETURNING kyc_status, id_proof_url",
            [documentUrl, userId]
        );
        res.status(200).json({
            message: "KYC Document uploaded for verification! ⏳",
            kyc_status: updatedUser.rows[0].kyc_status
        });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/register', async (req, res) => {
    try {
        const { name, email, phone, password, role, age, city, bio, price, tags } = req.body;
        if (!name || !email || !phone || !password || !role) return res.status(400).json({ error: "Incomplete details!" });

        const userExists = await pool.query("SELECT * FROM users WHERE email = $1 OR phone = $2", [email, phone]);
        if (userExists.rows.length > 0) {
            const existingUser = userExists.rows[0];
            if (existingUser.is_verified) {
                return res.status(400).json({ error: "Email ya Phone pehle se register hai!" });
            } else {
                await pool.query("DELETE FROM users WHERE id = $1", [existingUser.id]);
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60000);

        const newUser = await pool.query(
            "INSERT INTO users (name, email, phone, password, role, age, city, bio, price, tags, otp, otp_expiry, is_verified) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false) RETURNING id, email",
            [name, email, phone, hashedPassword, role, age || null, city || '', bio || '', price || 0, tags || '', otp, otpExpiry]
        );

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'RentGF - Your Account Verification OTP',
            text: `Welcome to RentGF! Your OTP for account verification is: ${otp}. It is valid for 10 minutes.`
        };

        transporter.sendMail(mailOptions, (error, info) => { });
        res.status(201).json({ message: "OTP sent to email!", userId: newUser.rows[0].id });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (result.rows.length === 0) return res.status(400).json({ error: "User nahi mila!" });
        const user = result.rows[0];
        if (user.otp !== otp) return res.status(400).json({ error: "Galat OTP!" });
        if (new Date() > new Date(user.otp_expiry)) return res.status(400).json({ error: "OTP expire ho gaya hai!" });
        await pool.query("UPDATE users SET is_verified = true, otp = null, otp_expiry = null WHERE id = $1", [user.id]);
        res.status(200).json({ message: "Account Verified Successfully! Ab aap login kar sakte hain." });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { emailOrPhone, password } = req.body;
        if (!emailOrPhone || !password) return res.status(400).json({ error: "Incomplete details provided!" });

        const userResult = await pool.query("SELECT * FROM users WHERE email = $1 OR phone = $1", [emailOrPhone]);
        if (userResult.rows.length === 0) return res.status(400).json({ error: "Account not found! Please register first." });

        const user = userResult.rows[0];
        if (!user.is_verified) return res.status(403).json({ error: "Please verify your account using the Email OTP first!" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Incorrect password!" });

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        const { password: _, otp, otp_expiry, ...userData } = user;

        res.status(200).json({ message: "Login successful!", token: token, user: userData });
    } catch (err) {
        res.status(500).json({ error: "Internal server error!" });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const { role } = req.query;
        const users = await pool.query(`
            SELECT u.id, u.name, u.age, u.city, u.bio, u.price, u.profile_pic, u.role, u.tags, u.is_private, u.kyc_status,
                   COALESCE(ROUND(AVG(r.rating), 1), 0) as avg_rating,
                   COUNT(r.id) as review_count
            FROM users u
            LEFT JOIN reviews r ON u.id = r.companion_id
            WHERE u.role = $1
            GROUP BY u.id
            ORDER BY avg_rating DESC, review_count DESC
        `, [role]);
        res.status(200).json(users.rows);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/upload/:userId', upload.single('profile_pic'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Koi file upload nahi hui!" });
        const { userId } = req.params;
        const mediaUrl = req.file.path;
        await pool.query("UPDATE users SET profile_pic = $1 WHERE id = $2", [mediaUrl, userId]);
        res.status(200).json({ message: "Photo update ho gayi!", imageUrl: mediaUrl });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/posts/:userId', upload.single('post_image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Photo select karna zaroori hai!" });
        const { userId } = req.params;
        const { caption } = req.body;
        const mediaUrl = req.file.path;
        const newPost = await pool.query(
            "INSERT INTO posts (user_id, image_url, caption) VALUES ($1, $2, $3) RETURNING *",
            [userId, mediaUrl, caption || ""]
        );
        res.status(201).json({ message: "Post live ho gayi!", post: newPost.rows[0] });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/chat-image', upload.single('image'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Koi photo select nahi ki!" });
        res.status(200).json({ imageUrl: req.file.path });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.get('/api/posts/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const posts = await pool.query("SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
        res.status(200).json(posts.rows);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.get('/api/chats/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const query = `
            SELECT DISTINCT u.id, u.name, u.role
            FROM messages m
            JOIN users u ON (u.id = m.sender_id OR u.id = m.receiver_id)
            WHERE (m.sender_id = $1 OR m.receiver_id = $1)
            AND u.id != $1
        `;
        const chatHistory = await pool.query(query, [userId]);
        res.status(200).json(chatHistory.rows);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Access Denied. No token." });
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid token." });
        req.user = user;
        next();
    });
};

app.get('/api/me', authenticateToken, async (req, res) => {
    try {
        const userResult = await pool.query(
            "SELECT id, name, email, role, age, city, bio, price, profile_pic, tags, is_private FROM users WHERE id = $1",
            [req.user.id]
        );
        if (userResult.rows.length === 0) return res.status(404).json({ error: "User nahi mila!" });
        res.status(200).json(userResult.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.get('/api/girl/stats/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const statsQuery = `
            SELECT 
                COALESCE(SUM(amount), 0) as total_earnings, 
                COUNT(*) as total_sessions 
            FROM bookings 
            WHERE girl_id = $1 AND status = 'completed'
        `;
        const stats = await pool.query(statsQuery, [userId]);
        res.status(200).json({
            earnings: stats.rows[0].total_earnings,
            sessions: stats.rows[0].total_sessions,
            rating: "4.8"
        });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.get('/api/messages/:user1/:user2', async (req, res) => {
    try {
        const { user1, user2 } = req.params;
        const query = `
            SELECT id, sender_id, receiver_id, text AS message, image_url, created_at, is_read 
            FROM messages 
            WHERE ((sender_id = $1 AND receiver_id = $2) 
               OR (sender_id = $2 AND receiver_id = $1))
            AND NOT ($1 = ANY(COALESCE(deleted_for, '{}')))
            ORDER BY created_at ASC
        `;
        const result = await pool.query(query, [user1, user2]);
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/follow', async (req, res) => {
    try {
        const { follower_id, following_id } = req.body;
        if (follower_id === following_id) return res.status(400).json({ error: "You cannot follow yourself." });

        await pool.query("INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [follower_id, following_id]);
        await pool.query("INSERT INTO notifications (user_id, sender_id, type) VALUES ($1, $2, 'follow')", [following_id, follower_id]);

        res.status(200).json({ message: "Followed successfully" });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/unfollow', async (req, res) => {
    try {
        const { follower_id, following_id } = req.body;
        await pool.query("DELETE FROM follows WHERE follower_id = $1 AND following_id = $2", [follower_id, following_id]);
        res.status(200).json({ message: "Unfollowed successfully" });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.get('/api/follow-stats/:profileId', async (req, res) => {
    try {
        const { profileId } = req.params;
        const { currentUserId } = req.query;
        const followersResult = await pool.query("SELECT COUNT(*) FROM follows WHERE following_id = $1", [profileId]);
        const followingResult = await pool.query("SELECT COUNT(*) FROM follows WHERE follower_id = $1", [profileId]);

        let isFollowing = false;
        if (currentUserId) {
            const checkFollow = await pool.query("SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2", [currentUserId, profileId]);
            isFollowing = checkFollow.rows.length > 0;
        }

        res.status(200).json({
            followers: parseInt(followersResult.rows[0].count),
            following: parseInt(followingResult.rows[0].count),
            isFollowing: isFollowing
        });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.put('/api/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { age, city, bio, price, tags, is_private } = req.body;
        const updatedUser = await pool.query(
            "UPDATE users SET age = $1, city = $2, bio = $3, price = $4, tags = $5, is_private = $6 WHERE id = $7 RETURNING *",
            [age || null, city || '', bio || '', price || 0, tags || 'Coffee Date, Movie', is_private || false, userId]
        );
        res.status(200).json({ message: "Profile Updated", user: updatedUser.rows[0] });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/bookings', async (req, res) => {
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

app.get('/api/bookings/:userId', async (req, res) => {
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

app.put('/api/bookings/:bookingId', async (req, res) => {
    try {
        const { status } = req.body;
        const updatedBooking = await pool.query("UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *", [status, req.params.bookingId]);
        res.status(200).json(updatedBooking.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/reviews', async (req, res) => {
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

app.get('/api/reviews/:userId', async (req, res) => {
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
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await pool.query(`
            SELECT id, name, email, phone, role, kyc_status, id_proof_url, is_verified 
            FROM users 
            ORDER BY id DESC
        `);
        res.status(200).json(users.rows);
    } catch (err) {
        console.error("Admin users fetch error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.put('/api/admin/kyc/:userId', async (req, res) => {
    try {
        const { status } = req.body; 
        await pool.query("UPDATE users SET kyc_status = $1 WHERE id = $2", [status, req.params.userId]);
        res.status(200).json({ message: `KYC successfully marked as ${status}` });
    } catch (err) {
        console.error("KYC update error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.get('/api/admin/stats', async (req, res) => {
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
        console.error("Admin stats error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.get('/api/make-admin/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const result = await pool.query("UPDATE users SET role = 'admin' WHERE email = $1 RETURNING *", [email]);

        if (result.rows.length > 0) {
            res.status(200).send(`<h1>🔥 Badaai ho Boss! ${email} ab SUPER ADMIN ban chuka hai.</h1> <p>Ab app mein dobara login karo.</p>`);
        } else {
            res.status(404).send(`User not found with email: ${email}`);
        }
    } catch (err) {
        console.error("Make admin error:", err);
        res.status(500).send("Error making admin");
    }
});
app.delete('/api/posts/:postId', async (req, res) => {
    try {
        const { postId } = req.params;
        await pool.query("DELETE FROM posts WHERE id = $1", [postId]);
        res.status(200).json({ message: "Post deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.get('/api/feed', async (req, res) => {
    try {
        const { currentUserId } = req.query;
        const feedQuery = `
            SELECT 
                p.id, p.image_url, p.caption, p.created_at,
                u.id as user_id, u.name as user_name, u.profile_pic as user_pic, u.role as user_role,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as total_likes,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as total_comments,
                EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) as is_liked_by_me,
                EXISTS(SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = p.user_id) as is_followed_by_me
            FROM posts p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
            LIMIT 50;
        `;
        const feed = await pool.query(feedQuery, [currentUserId || null]);
        res.status(200).json(feed.rows);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/like', async (req, res) => {
    try {
        const { user_id, post_id } = req.body;
        const checkLike = await pool.query("SELECT * FROM likes WHERE user_id = $1 AND post_id = $2", [user_id, post_id]);

        if (checkLike.rows.length > 0) {
            await pool.query("DELETE FROM likes WHERE user_id = $1 AND post_id = $2", [user_id, post_id]);
            res.status(200).json({ message: "Post unliked", isLiked: false });
        } else {
            await pool.query("INSERT INTO likes (user_id, post_id) VALUES ($1, $2)", [user_id, post_id]);

            const postOwnerRes = await pool.query("SELECT user_id FROM posts WHERE id = $1", [post_id]);
            const postOwnerId = postOwnerRes.rows[0]?.user_id;

            if (postOwnerId && String(postOwnerId) !== String(user_id)) {
                await pool.query("INSERT INTO notifications (user_id, sender_id, type, post_id) VALUES ($1, $2, 'like', $3)", [postOwnerId, user_id, post_id]);
            }

            res.status(200).json({ message: "Post liked", isLiked: true });
        }
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/comment', async (req, res) => {
    try {
        const { user_id, post_id, text } = req.body;
        if (!text || text.trim() === '') return res.status(400).json({ error: "Comment cannot be empty" });

        const newComment = await pool.query(
            "INSERT INTO comments (user_id, post_id, text) VALUES ($1, $2, $3) RETURNING *",
            [user_id, post_id, text]
        );

        const postOwnerRes = await pool.query("SELECT user_id FROM posts WHERE id = $1", [post_id]);
        const postOwnerId = postOwnerRes.rows[0]?.user_id;

        if (postOwnerId && String(postOwnerId) !== String(user_id)) {
            await pool.query("INSERT INTO notifications (user_id, sender_id, type, post_id) VALUES ($1, $2, 'comment', $3)", [postOwnerId, user_id, post_id]);
        }

        res.status(201).json(newComment.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.get('/api/comments/:postId', async (req, res) => {
    try {
        const { postId } = req.params;
        const commentsQuery = `
            SELECT c.id, c.text, c.created_at, u.name as user_name, u.profile_pic as user_pic
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = $1
            ORDER BY c.created_at ASC
        `;
        const comments = await pool.query(commentsQuery, [postId]);
        res.status(200).json(comments.rows);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.get('/api/notifications/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const notifQuery = `
            SELECT n.id, n.type, n.post_id, n.is_read, n.created_at,
                   u.name as sender_name, u.profile_pic as sender_pic,
                   p.image_url as post_image
            FROM notifications n
            JOIN users u ON n.sender_id = u.id
            LEFT JOIN posts p ON n.post_id = p.id
            WHERE n.user_id = $1
            ORDER BY n.created_at DESC
        `;
        const notifications = await pool.query(notifQuery, [userId]);
        await pool.query("UPDATE notifications SET is_read = true WHERE user_id = $1", [userId]);
        res.status(200).json(notifications.rows);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.delete('/api/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        await pool.query("DELETE FROM posts WHERE user_id = $1", [userId]);
        await pool.query("DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1", [userId]);
        await pool.query("DELETE FROM bookings WHERE boy_id = $1 OR girl_id = $1", [userId]);
        await pool.query("DELETE FROM reviews WHERE reviewer_id = $1 OR companion_id = $1", [userId]);
        await pool.query("DELETE FROM notifications WHERE user_id = $1 OR sender_id = $1", [userId]);
        await pool.query("DELETE FROM users WHERE id = $1", [userId]);
        res.status(200).json({ message: "Account deleted forever" });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = pool;