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
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const pool = new Pool({
    connectionString: "postgresql://neondb_owner:npg_8VKzyms7OMvw@ep-twilight-sun-a1oynkx0.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
    ssl: {
        rejectUnauthorized: false
    }
});

pool.connect()
    .then(() => console.log('✅ PostgreSQL Connected Successfully'))
    .catch((err) => console.error('❌ Database connection error:', err.stack));

io.on("connection", (socket) => {
    console.log(`⚡ Naya user connect hua Socket pe: ${socket.id}`);

    socket.on("join_room", (room) => {
        socket.join(room);
        console.log(`User ID: ${socket.id} ne room join kiya: ${room}`);
    });

    socket.on("send_message", async (data) => {

        socket.to(data.room).emit("receive_message", data);

        try {
            await pool.query(
                "INSERT INTO messages (sender_id, receiver_id, text) VALUES ($1, $2, $3)",
                [data.sender_id, data.receiver_id, data.text || data.message]
            );
        } catch (err) {
            console.error("❌ Message save karne mein error:", err.message);
        }
    });

    socket.on("disconnect", () => {
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
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.post('/api/upload/:userId', upload.single('profile_pic'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Koi file upload nahi hui!" });
        }

        const { userId } = req.params;
        const imageUrl = `https://rentgf-and-bf.onrender.com/uploads/${req.file.filename}`;

        await pool.query("UPDATE users SET profile_pic = $1 WHERE id = $2", [imageUrl, userId]);

        res.status(200).json({ message: "Photo update ho gayi!", imageUrl: imageUrl });
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
        const imageUrl = `https://rentgf-and-bf.onrender.com/uploads/${req.file.filename}`;

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
            "SELECT id, name, email, role FROM users WHERE id = $1",
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
app.put('/api/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { age, city, bio, price, tags } = req.body; 

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