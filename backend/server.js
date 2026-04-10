const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// --- SOCKET.IO KE LIYE NAYE IMPORTS ---
const http = require('http');
const { Server } = require('socket.io');

const app = express();

// --- SOCKET.IO SERVER SETUP ---
// Express app ko HTTP server ke andar daala
const server = http.createServer(app);

// Socket.io initialize kiya
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000", // React frontend URL
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json()); // Frontend se aane wale JSON data ko parse karne ke liye
// Yeh line 'uploads' folder ko public banati hai, taaki frontend se photos dikh sakein
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// PostgreSQL Database Connection Pool
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'dating_app',
    password: process.env.DB_PASSWORD || 'your_password',
    port: process.env.DB_PORT || 5432,
});

// Database connection test
pool.connect()
    .then(() => console.log('✅ PostgreSQL Connected Successfully'))
    .catch((err) => console.error('❌ Database connection error:', err.stack));

// --- REAL-TIME CHAT LOGIC (SOCKET.IO) ---
io.on("connection", (socket) => {
    console.log(`⚡ Naya user connect hua Socket pe: ${socket.id}`);

    // 1. User room join karega (Dono users ek hi room mein honge tabhi private chat hogi)
    socket.on("join_room", (room) => {
        socket.join(room);
        console.log(`User ID: ${socket.id} ne room join kiya: ${room}`);
    });

    // 2. Jab koi user message bhejega
    socket.on("send_message", async (data) => {
        // data = { sender_id, receiver_id, message, room }

        // Message ko room mein dusre user ko bhejna (Real-time)
        socket.to(data.room).emit("receive_message", data);

        // Message ko Database (messages table) mein save karna
        try {
            await pool.query(
                "INSERT INTO messages (sender_id, receiver_id, message) VALUES ($1, $2, $3)",
                [data.sender_id, data.receiver_id, data.message]
            );
        } catch (err) {
            console.error("❌ Message save karne mein error:", err.message);
        }
    });

    // 3. User disconnect
    socket.on("disconnect", () => {
        console.log(`User disconnect ho gaya: ${socket.id}`);
    });
});


// Basic Test Route
app.get('/', (req, res) => {
    res.send('Dating App Backend with PostgreSQL & Socket.io is running!');
});

// --- AUTHENTICATION ROUTES ---

// 1. User Registration (Signup) API
// 2. Register API (Updated to save all details)
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
// 2. User Login API
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

        res.status(200).json({
            message: "Login successful!",
            token: token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server mein kuch gadbad hai!" });
    }
});

// 3. Get Users API (Opposite gender ki profiles dikhane ke liye)
// 4. Get Users list (Find Page ke liye)
app.get('/api/users', async (req, res) => {
    try {
        const { role } = req.query;
        const users = await pool.query(
            "SELECT id, name, age, city, bio, price, profile_pic, role, tags FROM users WHERE role = $1",
            [role]
        );
        res.status(200).json(users.rows);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});
// --- MULTER SETUP (Photos save karne ke liye) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Photos kahan save hongi
    },
    filename: (req, file, cb) => {
        // Photo ka unique naam (taaki same naam ki 2 photo clash na karein)
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// 8. Upload Profile Picture API
app.post('/api/upload/:userId', upload.single('profile_pic'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Koi file upload nahi hui!" });
        }

        const { userId } = req.params;
        // Photo ka URL generate karna (jaise: http://localhost:5000/uploads/12345.jpg)
        const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;

        // Database mein URL update karna
        await pool.query("UPDATE users SET profile_pic = $1 WHERE id = $2", [imageUrl, userId]);

        res.status(200).json({ message: "Photo update ho gayi!", imageUrl: imageUrl });
    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ error: "Server error" });
    }
});
// 9. Upload New Post (Image + Caption)
app.post('/api/posts/:userId', upload.single('post_image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Photo select karna zaroori hai!" });

        const { userId } = req.params;
        const { caption } = req.body;
        const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;

        const newPost = await pool.query(
            "INSERT INTO posts (user_id, image_url, caption) VALUES ($1, $2, $3) RETURNING *",
            [userId, imageUrl, caption || ""]
        );

        res.status(201).json({ message: "Post live ho gayi!", post: newPost.rows[0] });
    } catch (err) {
        console.error("Post upload error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// 10. Get User Posts (Profile par dikhane ke liye)
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
// 4. Get User's Chat History (Dashboard pe messages dikhane ke liye)
app.get('/api/chats/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Ye SQL query un saare users ko nikalegi jinse current user ne baat ki hai
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
// --- MIDDLEWARE: Token verify karne ke liye ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // Format hota hai: "Bearer <token>"
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Access Denied. No token." });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid token." });
        req.user = user; // { id, role } jo humne login pe token mein daala tha
        next();
    });
};

// 5. Auto-Login (Verify Token & Get User) API
app.get('/api/me', authenticateToken, async (req, res) => {
    try {
        // Token se id mil gayi, ab database se user nikal lo
        const userResult = await pool.query(
            "SELECT id, name, email, role FROM users WHERE id = $1",
            [req.user.id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: "User nahi mila!" });
        }

        // Frontend ko user detail bhej do
        res.status(200).json(userResult.rows[0]);
    } catch (err) {
        console.error("Auto-login error:", err.message);
        res.status(500).json({ error: "Server error" });
    }
});
// 6. Girl Dashboard Stats API
app.get('/api/girl/stats/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Total Earnings aur Total Sessions nikalna
        const statsQuery = `
            SELECT 
                COALESCE(SUM(amount), 0) as total_earnings, 
                COUNT(*) as total_sessions 
            FROM bookings 
            WHERE girl_id = $1 AND status = 'completed'
        `;
        const stats = await pool.query(statsQuery, [userId]);

        // Average Rating (Abhi ke liye dummy 4.8 bhej rahe hain jab tak reviews table na bane)
        res.status(200).json({
            earnings: stats.rows[0].total_earnings,
            sessions: stats.rows[0].total_sessions,
            rating: "4.8"
        });
    } catch (err) {
        res.status(500).json({ error: "Stats fetch karne mein dikkat aayi" });
    }
});
// 7. Get Messages between two users (Chat kholte hi purane messages dikhane ke liye)
app.get('/api/messages/:user1/:user2', async (req, res) => {
    try {
        const { user1, user2 } = req.params;

        const query = `
            SELECT * FROM messages 
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
// 11. Update Profile (Edit Profile)
app.put('/api/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { age, city, bio, price, tags } = req.body; // NAYA: tags

        const updatedUser = await pool.query(
            "UPDATE users SET age = $1, city = $2, bio = $3, price = $4, tags = $5 WHERE id = $6 RETURNING *",
            [age || null, city || '', bio || '', price || 0, tags || 'Coffee Date, Movie', userId]
        );

        res.status(200).json({ message: "Profile Updated", user: updatedUser.rows[0] });
    } catch (err) {
        console.error("Update error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// 12. Delete Post (Gallery se photo hatana)
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

// 13. Delete Account (Hamesha ke liye profile uda dena)
app.delete('/api/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Account delete karne se pehle uski saari purani cheezein delete karni padengi
        await pool.query("DELETE FROM posts WHERE user_id = $1", [userId]);
        await pool.query("DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1", [userId]);
        await pool.query("DELETE FROM bookings WHERE boy_id = $1 OR girl_id = $1", [userId]);

        // Ab main user delete karo
        await pool.query("DELETE FROM users WHERE id = $1", [userId]);

        res.status(200).json({ message: "Account deleted forever" });
    } catch (err) {
        console.error("Delete account error:", err);
        res.status(500).json({ error: "Server error" });
    }
});
const PORT = process.env.PORT || 5000;

// DHYAN DEIN: Yahan app.listen ki jagah server.listen aayega
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Export pool taaki baaki files mein queries run kar sakein
module.exports = pool;