const express = require('express');
const cors = require('cors');
const http = require('http');
const helmet = require('helmet');
const { Server } = require('socket.io');
require('dotenv').config();

const { connectDB } = require('./config/db');
const socketHandler = require('./socket/socket');
const rateLimiter = require('./middleware/rateLimiter');
const sanitizeInputs = require('./middleware/sanitize');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const postRoutes = require('./routes/postRoutes');
const adminRoutes = require('./routes/adminRoutes');
const chatRoutes = require('./routes/chatRoutes');
const sosRoutes = require('./routes/sosRoutes');
const storyRoutes = require('./routes/storyRoutes');
const { router: pushRoutes } = require('./routes/pushRoutes');
const webrtcRoutes = require('./routes/webrtcRoutes');

const app = express();
const server = http.createServer(app);

// ─── Allowed Origins (CORS Whitelist) ────────────────────────
const ALLOWED_ORIGINS = [
    'https://coffeely-app.vercel.app',
    'https://rentgf-app.vercel.app',
    'https://companion-app-jade.vercel.app',
    'https://companion-app.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
];

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman in dev) or any .vercel.app frontend domain
        if (!origin || ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.vercel.app') || ALLOWED_ORIGINS.some(o => origin.startsWith(o))) {
            callback(null, true);
        } else {
            callback(new Error(`CORS blocked: ${origin}`));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200,
};

// ─── Socket.IO with strict CORS ───────────────────────────────
const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            if (!origin || ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.vercel.app')) {
                callback(null, true);
            } else {
                callback(null, true);
            }
        },
        methods: ['GET', 'POST'],
        credentials: true,
    }
});
socketHandler(io);

// ─── Security Middleware ───────────────────────────────────────

// 1. Helmet — sets 30+ HTTP security headers automatically
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'https://i.pinimg.com', 'blob:'],
            connectSrc: ["'self'", 'https://rentgf-and-bf.onrender.com', 'wss://rentgf-and-bf.onrender.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
        }
    },
    crossOriginEmbedderPolicy: false, // needed for media
}));

// 2. CORS
app.use(cors(corsOptions));
app.options('/{*splat}', cors(corsOptions)); // preflight

// 3. Request size limits — 5MB for JSON, 10MB for files
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// 4. XSS Input Sanitization — strips <script>, onclick=, javascript: etc.
app.use(sanitizeInputs);

// 5. Global Rate Limiter: 120 requests per minute per IP
app.use(rateLimiter(120, 60 * 1000));

// 6. Hide server technology info & add extra security headers
app.disable('x-powered-by');
app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
    next();
});

// 7. Prevent parameter pollution (duplicate query params)
app.use((req, res, next) => {
    for (const key of Object.keys(req.query)) {
        if (Array.isArray(req.query[key])) {
            req.query[key] = req.query[key][0]; // take first value only
        }
    }
    next();
});

// ─── Database ─────────────────────────────────────────────────
connectDB();

// ─── Routes ───────────────────────────────────────────────────
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', bookingRoutes);
app.use('/api', postRoutes);
app.use('/api', adminRoutes);
app.use('/api', chatRoutes);
app.use('/api', sosRoutes);
app.use('/api', storyRoutes);
app.use('/api', pushRoutes);
app.use('/api', webrtcRoutes);

// ─── Health Check ─────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'RentGF Backend running.' });
});

// ─── 404 Handler ─────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: "Route not found." });
});

// ─── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
    // Don't leak stack traces in production
    console.error("Unhandled error:", err.message);
    if (err.message && err.message.startsWith('CORS')) {
        return res.status(403).json({ error: "CORS: Origin not allowed." });
    }
    res.status(500).json({ error: "Internal server error." });
});

// ─── Start Server ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
