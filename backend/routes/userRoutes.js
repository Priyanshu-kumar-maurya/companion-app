const express = require('express');
const { pool } = require('../config/db');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// Helper: Ensure user can only modify their OWN account
const isOwner = (req, res, userId) => {
    if (parseInt(req.user.id) !== parseInt(userId)) {
        res.status(403).json({ error: "Forbidden: Tum sirf apna account modify kar sakte ho." });
        return false;
    }
    return true;
};

// 1. Get Current Logged-in User Info
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const userResult = await pool.query(
            "SELECT id, name, email, role, age, city, bio, price, profile_pic, tags, is_private, kyc_status, social_link FROM users WHERE id = $1",
            [req.user.id]
        );
        if (userResult.rows.length === 0) return res.status(404).json({ error: "User nahi mila!" });
        res.status(200).json(userResult.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// 2. Get Users List (For Feed/Find page based on Role)
router.get('/users', async (req, res) => {
    try {
        const { role } = req.query;
        if (!role || !['boy', 'girl'].includes(role)) {
            return res.status(400).json({ error: "Valid role parameter required (boy/girl)." });
        }
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

// 3. Update User Profile Settings — AUTH REQUIRED + OWNERSHIP CHECK
router.put('/users/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        if (!isOwner(req, res, userId)) return;

        const { age, city, bio, price, tags, is_private } = req.body;

        // Validate price is not negative
        const safePrice = Math.max(0, parseInt(price) || 0);

        const updatedUser = await pool.query(
            "UPDATE users SET age = $1, city = $2, bio = $3, price = $4, tags = $5, is_private = $6 WHERE id = $7 RETURNING id, name, email, role, age, city, bio, price, tags, is_private, kyc_status",
            [age || null, city || '', bio || '', safePrice, tags || 'Coffee Date, Movie', is_private || false, userId]
        );
        res.status(200).json({ message: "Profile Updated", user: updatedUser.rows[0] });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// 4. Delete Account Forever — AUTH REQUIRED + OWNERSHIP CHECK
router.delete('/users/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;

        // Admins can delete any user; others can only delete their own
        if (req.user.role !== 'admin' && !isOwner(req, res, userId)) return;

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

// 5. Follow User — AUTH REQUIRED
router.post('/follow', authenticateToken, async (req, res) => {
    try {
        const { follower_id, following_id } = req.body;

        // Ensure the requester can only follow as themselves
        if (parseInt(req.user.id) !== parseInt(follower_id)) {
            return res.status(403).json({ error: "Tum doosre ki taraf se follow nahi kar sakte." });
        }
        if (follower_id === following_id) return res.status(400).json({ error: "You cannot follow yourself." });

        await pool.query("INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [follower_id, following_id]);
        await pool.query("INSERT INTO notifications (user_id, sender_id, type) VALUES ($1, $2, 'follow')", [following_id, follower_id]);

        res.status(200).json({ message: "Followed successfully" });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// 6. Unfollow User — AUTH REQUIRED
router.post('/unfollow', authenticateToken, async (req, res) => {
    try {
        const { follower_id, following_id } = req.body;

        if (parseInt(req.user.id) !== parseInt(follower_id)) {
            return res.status(403).json({ error: "Tum doosre ki taraf se unfollow nahi kar sakte." });
        }

        await pool.query("DELETE FROM follows WHERE follower_id = $1 AND following_id = $2", [follower_id, following_id]);
        res.status(200).json({ message: "Unfollowed successfully" });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// 7. Get Follow Stats (Followers/Following Count) — Public
router.get('/follow-stats/:profileId', async (req, res) => {
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

// 8. Get Companion (Girl) Earnings Stats — AUTH REQUIRED + OWNERSHIP CHECK
router.get('/girl/stats/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;

        // Only the user themselves or admin can see stats
        if (req.user.role !== 'admin' && parseInt(req.user.id) !== parseInt(userId)) {
            return res.status(403).json({ error: "Forbidden: Sirf apni stats dekh sakte ho." });
        }

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

module.exports = router;