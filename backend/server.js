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


            await pool.query(`CREATE TABLE IF NOT EXISTS bookings (
                id SERIAL PRIMARY KEY,
                boy_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                girl_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                hours INTEGER NOT NULL,
                amount INTEGER NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
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
    console.log(`⚡ Naya user connect hua Socket pe: ${socket.id}`);

    socket.on("user_connected", (userId) => {
        onlineUsers.set(userId.toString(), socket.id);
        io.emit("update_online_users", Array.from(onlineUsers.keys()));
    });

    socket.on("join_own_room", (userId) => {
        socket.join(`user_${userId}`);
        console.log(`User ${userId} ne apna notification room join kiya.`);
    });

    socket.on("join_room", (room) => {
        socket.join(room);
        console.log(`User ID: ${socket.id} ne room join kiya: ${room}`);
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
        } catch (err) {
            console.error("❌ Message save karne mein error:", err.message);
        }
    });

    socket.on("mark_messages_read", async (data) => {
        try {
            await pool.query("UPDATE messages SET is_read = true WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false", [data.sender_id, data.receiver_id]);
            io.to(data.room).emit("messages_read_update", data);
        } catch (error) {
            console.error(error);
        }
    });

    socket.on("edit_message", async (data) => {
        try {
            await pool.query("UPDATE messages SET text = $1 WHERE id = $2 AND sender_id = $3", [data.newText, data.messageId, data.sender_id]);
            io.to(data.room).emit("message_edited", { messageId: data.messageId, newText: data.newText });
        } catch (error) {
            console.error("Edit error:", error);
        }
    });

    socket.on("delete_message", async (data) => {
        try {
            await pool.query("DELETE FROM messages WHERE id = $1 AND sender_id = $2", [data.messageId, data.sender_id]);
            io.to(data.room).emit("message_deleted", data.messageId);
        } catch (error) {
            console.error("Delete error:", error);
        }
    });

    socket.on("delete_for_me", async (data) => {
        try {
            await pool.query("UPDATE messages SET deleted_for = array_append(deleted_for, $1) WHERE id = $2", [data.userId, data.messageId]);
        } catch (error) {
            console.error("Delete for me error:", error);
        }
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
        console.log(`User disconnect ho gaya: ${socket.id}`);
    });
});

app.get('/', (req, res) => {
    res.send('Dating App Backend with PostgreSQL & Socket.io is running!');
});
app.post('/api/kyc/:userId', upload.single('id_document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Koi document upload nahi hua!" });
        }
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
        console.error("KYC Upload error:", err);
        res.status(500).json({ error: "Server error" });
    }
});
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, role, age, city, bio, price, tags } = req.body;
        if (!name || !email || !password || !role) return res.status(400).json({ error: "Name, email, password required!" });

        const userExists = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userExists.rows.length > 0) return res.status(400).json({ error: "Email pehle se register hai!" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            "INSERT INTO users (name, email, password, role, age, city, bio, price, tags) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, name, email, role, age, city, bio, price, tags, profile_pic, kyc_status",
            [name, email, hashedPassword, role, age || null, city || '', bio || '', price || 0, tags || '']
        );
        res.status(201).json({ message: "Registered!", user: newUser.rows[0] });
    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({ error: "Email, password aur role zaroori hai!" });
        }

        const userResult = await pool.query("SELECT * FROM users WHERE email = $1 AND role = $2", [email, role]);

        if (userResult.rows.length === 0) {
            return res.status(400).json({ error: "User nahi mila ya role galat hai!" });
        }

        const user = userResult.rows[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Galat password!" });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        const { password: _, ...userData } = user;

        res.status(200).json({
            message: "Login successful!",
            token: token,
            user: userData
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server mein kuch gadbad hai!" });
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
        console.error("Users fetch error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/upload/:userId', upload.single('profile_pic'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Koi file upload nahi hui!" });
        }

        const { userId } = req.params;
        const mediaUrl = req.file.path;

        await pool.query("UPDATE users SET profile_pic = $1 WHERE id = $2", [mediaUrl, userId]);

        res.status(200).json({ message: "Photo update ho gayi!", imageUrl: mediaUrl });
    } catch (err) {
        console.error("Upload error:", err);
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
        console.error("Post upload error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/chat-image', upload.single('image'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Koi photo select nahi ki!" });
        res.status(200).json({ imageUrl: req.file.path });
    } catch (err) {
        console.error("Chat image upload error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.get('/api/posts/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const posts = await pool.query(
            "SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC",
            [userId]
        );
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
        console.error("Chat history fetch error:", err.message);
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

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: "User nahi mila!" });
        }

        res.status(200).json(userResult.rows[0]);
    } catch (err) {
        console.error("Auto-login error:", err.message);
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
        res.status(500).json({ error: "Stats fetch karne mein dikkat aayi" });
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
        console.error("Messages fetch error:", err.message);
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
        console.error("Update error:", err);
        res.status(500).json({ error: "Server error" });
    }
});


app.post('/api/bookings', async (req, res) => {
    try {
        const { boy_id, girl_id, hours, amount, meeting_date, meeting_time, meeting_location, meeting_details } = req.body;

        const newBooking = await pool.query(
            "INSERT INTO bookings (boy_id, girl_id, hours, amount, meeting_date, meeting_time, meeting_location, meeting_details) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
            [boy_id, girl_id, hours, amount, meeting_date, meeting_time, meeting_location, meeting_details]
        );
        res.status(201).json(newBooking.rows[0]);
    } catch (err) {
        console.error("Booking error:", err);
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
        console.error("Booking fetch error:", err);
        res.status(500).json({ error: "Server error" });
    }
});
app.put('/api/bookings/:bookingId', async (req, res) => {
    try {
        const { status } = req.body;
        const updatedBooking = await pool.query(
            "UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *",
            [status, req.params.bookingId]
        );
        res.status(200).json(updatedBooking.rows[0]);
    } catch (err) {
        console.error("Booking update error:", err);
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
        console.error("Review error:", err);
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
        console.error("Review fetch error:", err);
        res.status(500).json({ error: "Server error" });
    }
});


app.delete('/api/posts/:postId', async (req, res) => {
    try {
        const { postId } = req.params;
        await pool.query("DELETE FROM posts WHERE id = $1", [postId]);
        res.status(200).json({ message: "Post deleted successfully" });
    } catch (err) {
        console.error("Delete post error:", err);
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

        await pool.query("DELETE FROM users WHERE id = $1", [userId]);

        res.status(200).json({ message: "Account deleted forever" });
    } catch (err) {
        console.error("Delete account error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = pool;