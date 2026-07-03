const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const connectDB = async () => {
    try {
        await pool.connect();
        console.log('✅ PostgreSQL Connected Successfully');

        // Auto-fix tables
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS show_online BOOLEAN DEFAULT true;");
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
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS social_link TEXT;");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT false;");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_platform_blocked BOOLEAN DEFAULT false;");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;");

        // Saved posts table
        await pool.query(`CREATE TABLE IF NOT EXISTS saved_posts (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, post_id)
        );`);

        // Block/Report tables
        await pool.query(`CREATE TABLE IF NOT EXISTS blocked_users (
            id SERIAL PRIMARY KEY,
            blocker_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            blocked_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(blocker_id, blocked_id)
        );`);

        await pool.query(`CREATE TABLE IF NOT EXISTS reports (
            id SERIAL PRIMARY KEY,
            reporter_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            reported_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            reason TEXT NOT NULL,
            description TEXT,
            status VARCHAR(20) DEFAULT 'pending',
            created_at TIMESTAMPTZ DEFAULT NOW()
        );`);

        await pool.query(`CREATE TABLE IF NOT EXISTS bookings (
            id SERIAL PRIMARY KEY,
            boy_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            girl_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            hours INTEGER NOT NULL,
            amount INTEGER NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            meeting_date DATE,
            meeting_time TIME,
            meeting_location TEXT,
            meeting_details TEXT
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

        await pool.query(`CREATE TABLE IF NOT EXISTS reviews (
            id SERIAL PRIMARY KEY,
            reviewer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            companion_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            rating INTEGER CHECK (rating >= 1 AND rating <= 5),
            comment TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`);

        await pool.query(`CREATE TABLE IF NOT EXISTS emergency_contacts (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR(100) NOT NULL,
            phone VARCHAR(20) NOT NULL,
            email VARCHAR(255),
            relationship VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`);

        await pool.query(`CREATE TABLE IF NOT EXISTS sos_alerts (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
            latitude DECIMAL(10, 8),
            longitude DECIMAL(11, 8),
            message TEXT,
            status VARCHAR(20) DEFAULT 'active',
            resolved_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`);

        console.log('✅ Database Auto-Fixed: Tables ready!');
    } catch (err) {
        console.error('❌ Database connection error:', err.stack);
    }
};

module.exports = { pool, connectDB };