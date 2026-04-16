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
        console.log('✅ PostgreSQL Connected Successfully');
        try {
            await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;");
            await pool.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url TEXT;");

            // 🚨 YAHAN SE 'DROP TABLE' HATA DIYA HAI TAARI DATA DELETE NA HO 🚨

            // IF NOT EXISTS laga diya taaki table pehle se ho toh wahi use kare
            await pool.query(`CREATE TABLE IF NOT EXISTS bookings (
                id SERIAL PRIMARY KEY,
                boy_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                girl_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                hours INTEGER NOT NULL,
                amount INTEGER NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );`);

            await pool.query(`CREATE TABLE IF NOT EXISTS reviews (
                id SERIAL PRIMARY KEY,
                reviewer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                companion_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                rating INTEGER CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );`);

            console.log('✅ Database Auto-Fixed: Tables ready!');
        } catch (e) {
            console.log('Column check warning:', e.message);
        }
    })
    .catch((err) => console.error('❌ Database connection error:', err.stack));

// 🟢 NAYA: Online users track karne ke liye Map
const onlineUsers = new Map();

io.on("connection", (socket) => {
    console.log(`⚡ Naya user connect hua Socket pe: ${socket.id}`);

    // 🟢 NAYA: Jab koi app kholta hai toh online dikhane ke liye
    socket.on("user_connected", (userId) => {
        onlineUsers.set(userId.toString(), socket.id);
        io.emit("update_online_users", Array.from(onlineUsers.keys())); // Sabko updated list bhej do
    });

    // NAYA: Har user ka apna ek personal room hoga notifications ke liye
    socket.on("join_own_room", (userId) => {
        socket.join(`user_${userId}`);
        console.log(`User ${userId} ne apna notification room join kiya.`);
    });

    socket.on("join_room", (room) => {
        socket.join(room);
        console.log(`User ID: ${socket.id} ne room join kiya: ${room}`);
    });

    // 🟢 UPDATE: Message send karna (Ab hum naye message ki asli ID return karenge)
    socket.on("send_message", async (data) => {
        try {
            const result = await pool.query(
                "INSERT INTO messages (sender_id, receiver_id, text, image_url) VALUES ($1, $2, $3, $4) RETURNING id, created_at",
                [data.sender_id, data.receiver_id, data.text || data.message || "", data.image_url || null]
            );

            // Jo message save hua uski ID data mein dal do
            const savedMessage = result.rows[0];
            data.id = savedMessage.id;
            data.created_at = savedMessage.created_at;

            io.to(data.room).emit("receive_message", data);

            if (data.receiver_id) {
                // Agar dusra room hai toh waha bhi bhej do
                socket.to(data.receiver_id.toString()).emit("receive_message", data);
            }
        } catch (err) {
            console.error("❌ Message save karne mein error:", err.message);
        }
    });

    // 🟢 NAYA: Message Edit karne ka logic
    socket.on("edit_message", async (data) => {
        try {
            await pool.query("UPDATE messages SET text = $1 WHERE id = $2 AND sender_id = $3", [data.newText, data.messageId, data.sender_id]);
            io.to(data.room).emit("message_edited", { messageId: data.messageId, newText: data.newText });
        } catch (error) {
            console.error("Edit error:", error);
        }
    });

    // 🟢 NAYA: Message Delete karne ka logic
    socket.on("delete_message", async (data) => {
        try {
            await pool.query("DELETE FROM messages WHERE id = $1 AND sender_id = $2", [data.messageId, data.sender_id]);
            io.to(data.room).emit("message_deleted", data.messageId);
        } catch (error) {
            console.error("Delete error:", error);
        }
    });

    // NAYA: Booking notification bhejne ka socket logic
    socket.on("send_booking_notification", (data) => {
        // Jisko booking aayi hai, uske personal room mein notification bhej do
        socket.to(`user_${data.receiver_id}`).emit("receive_booking_notification", data);
    });

    // 🟢 UPDATE: Jab koi tab band kare ya net chala jaye toh offline kar do
    socket.on("disconnect", () => {
        let disconnectedUserId = null;
        for (let [userId, socketId] of onlineUsers.entries()) {
            if (socketId === socket.id) {
                disconnectedUserId = userId;
                onlineUsers.delete(userId);
                break;
            }
        }
        // Agar user map mein tha, toh sabko batao wo offline chala gaya
        if (disconnectedUserId) {
            io.emit("update_online_users", Array.from(onlineUsers.keys()));
        }
        console.log(`User disconnect ho gaya: ${socket.id}`);
    });
});

app.get('/', (req, res) => {
    res.send('Dating App Backend with PostgreSQL & Socket.io is running!');
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
            "INSERT INTO users (name, email, password, role, age, city, bio, price, tags) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, name, email, role",
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
        const users = await pool.query(
            "SELECT id, name, age, city, bio, price, profile_pic, role, tags, is_private FROM users WHERE role = $1",
            [role]
        );
        res.status(200).json(users.rows);
    } catch (err) {
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
            rating: "4.8" // Ise aage chal kar dynamic karenge
        });
    } catch (err) {
        res.status(500).json({ error: "Stats fetch karne mein dikkat aayi" });
    }
});

app.get('/api/messages/:user1/:user2', async (req, res) => {
    try {
        const { user1, user2 } = req.params;

        const query = `
            SELECT id, sender_id, receiver_id, text AS message, image_url, created_at 
            FROM messages 
            WHERE (sender_id = $1 AND receiver_id = $2) 
               OR (sender_id = $2 AND receiver_id = $1)
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

// ==========================================
// 🟢 NAYI APIs: BOOKINGS AUR REVIEWS KI
// ==========================================

// 1. Nayi Booking Banana
app.post('/api/bookings', async (req, res) => {
    try {
        const { boy_id, girl_id, hours, amount } = req.body;
        const newBooking = await pool.query(
            "INSERT INTO bookings (boy_id, girl_id, hours, amount) VALUES ($1, $2, $3, $4) RETURNING *",
            [boy_id, girl_id, hours, amount]
        );
        res.status(201).json(newBooking.rows[0]);
    } catch (err) {
        console.error("Booking error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// 2. Booking Dashboard ke liye fetch karna (Ladki ko uski requests dikhane ke liye)
app.get('/api/bookings/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const bookings = await pool.query(`
            SELECT b.*, 
                   u.name as boy_name, u.profile_pic as boy_pic
            FROM bookings b
            JOIN users u ON b.boy_id = u.id
            WHERE b.girl_id = $1 OR b.boy_id = $1
            ORDER BY b.created_at DESC
        `, [userId]);
        res.status(200).json(bookings.rows);
    } catch (err) {
        console.error("Booking fetch error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// 3. Booking Accept/Reject karna
app.put('/api/bookings/:bookingId', async (req, res) => {
    try {
        const { status } = req.body; // 'accepted', 'rejected', 'completed'
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

// 4. Review Submit karna
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

// 5. Profile page par reviews fetch karna
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

// ==========================================

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