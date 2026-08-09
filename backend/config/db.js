const { Pool } = require('pg');
require('dotenv').config();

let connectionString = process.env.DATABASE_URL;
if (connectionString) {
    try {
        const parsedUrl = new URL(connectionString);
        parsedUrl.searchParams.set('sslmode', 'verify-full');
        parsedUrl.searchParams.set('usestdlibpqcompat', 'true');
        connectionString = parsedUrl.toString();
    } catch (e) {
        if (!connectionString.includes('usestdlibpqcompat=true')) {
            const separator = connectionString.includes('?') ? '&' : '?';
            connectionString = `${connectionString}${separator}sslmode=verify-full&usestdlibpqcompat=true`;
        }
    }
}

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

pool.on('error', (err) => {
    console.error('⚠️ Unexpected error on idle PostgreSQL client:', err.message || err);
});

const connectDB = async () => {
    try {
        await pool.connect();
        console.log('✅ PostgreSQL Connected Successfully');

        // Auto-fix tables
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS show_online BOOLEAN DEFAULT true;");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);");
        await pool.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url TEXT;");
        await pool.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS audio_url TEXT;");
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
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS dob VARCHAR(20);");
        await pool.query("ALTER TABLE posts ADD COLUMN IF NOT EXISTS show_on_feed BOOLEAN DEFAULT true;");
        await pool.query("ALTER TABLE posts ADD COLUMN IF NOT EXISTS show_on_profile BOOLEAN DEFAULT true;");
        await pool.query("ALTER TABLE posts ADD COLUMN IF NOT EXISTS followers_only BOOLEAN DEFAULT false;");
        await pool.query("ALTER TABLE posts ADD COLUMN IF NOT EXISTS disable_comments BOOLEAN DEFAULT false;");
        await pool.query("ALTER TABLE posts ADD COLUMN IF NOT EXISTS hide_likes BOOLEAN DEFAULT false;");
        await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;");
        await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS canceled_by VARCHAR(10);");
        await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS proposed_date DATE;");
        await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS proposed_time TIME;");
        await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reschedule_by VARCHAR(10);");
        await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reschedule_status VARCHAR(20) DEFAULT 'none';");
        await pool.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS time_slot VARCHAR(50);");
        
        // --- Username Column Migration & Unique Constraint ---
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50);");
        const checkNullUsernames = await pool.query("SELECT id, name FROM users WHERE username IS NULL OR username = '';");
        for (const u of checkNullUsernames.rows) {
            let baseUsername = u.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (!baseUsername) baseUsername = `user${u.id}`;
            let isUnique = false;
            let tempUsername = baseUsername;
            let counter = 1;
            while (!isUnique) {
                const checkDup = await pool.query("SELECT id FROM users WHERE username = $1 AND id != $2;", [tempUsername, u.id]);
                if (checkDup.rows.length === 0) {
                    isUnique = true;
                } else {
                    tempUsername = `${baseUsername}${counter}`;
                    counter++;
                }
            }
            await pool.query("UPDATE users SET username = $1 WHERE id = $2;", [tempUsername, u.id]);
        }
        await pool.query("ALTER TABLE users ADD CONSTRAINT unique_username UNIQUE (username);").catch(() => {});

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

        await pool.query(`CREATE TABLE IF NOT EXISTS call_history (
            id SERIAL PRIMARY KEY,
            caller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            call_type VARCHAR(10) DEFAULT 'voice',
            duration_seconds INTEGER DEFAULT 0,
            status VARCHAR(20) DEFAULT 'completed',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`);

        // ─── Performance Indexes ───────────────────────────────────
        await pool.query("CREATE INDEX IF NOT EXISTS idx_call_history_caller ON call_history(caller_id);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_call_history_receiver ON call_history(receiver_id);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_users_kyc ON users(kyc_status);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_bookings_boy ON bookings(boy_id);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_bookings_girl ON bookings(girl_id);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_reviews_companion ON reviews(companion_id);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports(reported_id);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_sos_alerts_user ON sos_alerts(user_id);");
        await pool.query("CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user ON emergency_contacts(user_id);");

        console.log('✅ Database Auto-Fixed: Tables & Indexes ready!');
    } catch (err) {
        console.error('❌ Database connection error:', err.stack);
    }
};

module.exports = { pool, connectDB };