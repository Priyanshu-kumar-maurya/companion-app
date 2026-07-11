const express = require('express');
const { pool } = require('../config/db');
const authenticateToken = require('../middleware/auth');
const { moderateContent } = require('../middleware/contentFilter');
const jwt = require('jsonwebtoken');

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
            "SELECT id, name, email, role, age, city, bio, price, profile_pic, tags, is_private, show_online, kyc_status, social_link FROM users WHERE id = $1",
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

        // Optional token verification to exclude blocked users
        let currentUserId = null;
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                currentUserId = decoded.id;
            } catch (e) {}
        }

        let query = `
            SELECT u.id, u.name, u.age, u.city, u.bio, u.price, u.profile_pic, u.role, u.tags, u.is_private, u.show_online, u.kyc_status,
                   COALESCE(ROUND(AVG(r.rating), 1), 0) as avg_rating,
                   COUNT(r.id) as review_count
            FROM users u
            LEFT JOIN reviews r ON u.id = r.companion_id
            WHERE u.role = $1 
              AND u.is_verified = true 
              AND u.is_frozen = false 
              AND u.is_platform_blocked = false
        `;
        const params = [role];

        if (currentUserId) {
            query += `
                AND u.id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = $2)
                AND u.id NOT IN (SELECT blocker_id FROM blocked_users WHERE blocked_id = $2)
                AND (u.is_private = false OR u.id = $2 OR EXISTS(SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = u.id))
            `;
            params.push(currentUserId);
        } else {
            query += `
                AND u.is_private = false
            `;
        }

        query += `
            GROUP BY u.id
            ORDER BY avg_rating DESC, review_count DESC
        `;

        const users = await pool.query(query, params);
        res.status(200).json(users.rows);
    } catch (err) {
        console.error("Get users list error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// 3. Update User Profile Settings — AUTH REQUIRED + OWNERSHIP CHECK
router.put('/users/:userId', authenticateToken, moderateContent, async (req, res) => {
    try {
        const { userId } = req.params;
        if (!isOwner(req, res, userId)) return;

        const { age, city, bio, price, tags, is_private, show_online } = req.body;

        // Validate price is not negative
        const safePrice = Math.max(0, parseInt(price) || 0);

        const updatedUser = await pool.query(
            "UPDATE users SET age = $1, city = $2, bio = $3, price = $4, tags = $5, is_private = $6, show_online = $7 WHERE id = $8 RETURNING id, name, email, role, age, city, bio, price, tags, is_private, show_online, kyc_status",
            [age || null, city || '', bio || '', safePrice, tags || 'Coffee Date, Movie', is_private || false, show_online !== false, userId]
        );
        res.status(200).json({ message: "Profile Updated", user: updatedUser.rows[0] });
    } catch (err) {
        console.error("Update profile error:", err);
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
        const ratingQuery = `
            SELECT COALESCE(AVG(rating), 0) as avg_rating 
            FROM reviews 
            WHERE companion_id = $1
        `;
        const [stats, ratingRes] = await Promise.all([
            pool.query(statsQuery, [userId]),
            pool.query(ratingQuery, [userId])
        ]);
        
        const avgRating = parseFloat(ratingRes.rows[0].avg_rating || 0).toFixed(1);
        
        res.status(200).json({
            earnings: stats.rows[0].total_earnings,
            sessions: stats.rows[0].total_sessions,
            rating: avgRating === '0.0' ? 'No Rating' : avgRating
        });
    } catch (err) {
        console.error("Girl stats error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// 9. Get Followers List — Public
router.get('/followers-list/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(`
            SELECT u.id, u.name, u.profile_pic, u.role
            FROM follows f
            JOIN users u ON f.follower_id = u.id
            WHERE f.following_id = $1
            ORDER BY f.created_at DESC
        `, [userId]);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Followers list error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// 10. Get Following List — Public
router.get('/following-list/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(`
            SELECT u.id, u.name, u.profile_pic, u.role
            FROM follows f
            JOIN users u ON f.following_id = u.id
            WHERE f.follower_id = $1
            ORDER BY f.created_at DESC
        `, [userId]);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Following list error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// 11. Block a User — AUTH REQUIRED
router.post('/block', authenticateToken, async (req, res) => {
    try {
        const { blocked_id } = req.body;
        const blocker_id = req.user.id;
        if (!blocked_id) return res.status(400).json({ error: "blocked_id required." });
        if (parseInt(blocker_id) === parseInt(blocked_id)) return res.status(400).json({ error: "You cannot block yourself." });

        await pool.query(
            "INSERT INTO blocked_users (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            [blocker_id, blocked_id]
        );
        // Also unfollow both ways
        await pool.query("DELETE FROM follows WHERE (follower_id = $1 AND following_id = $2) OR (follower_id = $2 AND following_id = $1)", [blocker_id, blocked_id]);

        res.status(200).json({ message: "User blocked successfully." });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// 12. Unblock a User — AUTH REQUIRED
router.post('/unblock', authenticateToken, async (req, res) => {
    try {
        const { blocked_id } = req.body;
        const blocker_id = req.user.id;
        if (!blocked_id) return res.status(400).json({ error: "blocked_id required." });

        await pool.query(
            "DELETE FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2",
            [blocker_id, blocked_id]
        );
        res.status(200).json({ message: "User unblocked successfully." });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// 12.5. Get Blocked Users List — AUTH REQUIRED
router.get('/blocked-users', authenticateToken, async (req, res) => {
    try {
        const blocker_id = req.user.id;
        const result = await pool.query(`
            SELECT u.id, u.name, u.profile_pic, u.role
            FROM blocked_users bu
            JOIN users u ON bu.blocked_id = u.id
            WHERE bu.blocker_id = $1
            ORDER BY bu.created_at DESC
        `, [blocker_id]);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Get blocked list error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// 13. Check if a user is blocked — AUTH REQUIRED
router.get('/block-status/:targetId', authenticateToken, async (req, res) => {
    try {
        const myId = req.user.id;
        const { targetId } = req.params;

        const result = await pool.query(
            "SELECT id FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2",
            [myId, targetId]
        );
        res.status(200).json({ isBlocked: result.rows.length > 0 });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// 14. Report a User — AUTH REQUIRED
router.post('/report', authenticateToken, async (req, res) => {
    try {
        const reporter_id = req.user.id;
        const { reported_id, reason, description } = req.body;

        if (!reported_id || !reason) return res.status(400).json({ error: "reported_id and reason required." });
        if (parseInt(reporter_id) === parseInt(reported_id)) return res.status(400).json({ error: "You cannot report yourself." });

        const validReasons = ['Fake Profile', 'Harassment', 'Spam', 'Inappropriate Content', 'Scam', 'Underage', 'Other'];
        if (!validReasons.includes(reason)) return res.status(400).json({ error: "Invalid reason." });

        await pool.query(
            "INSERT INTO reports (reporter_id, reported_id, reason, description) VALUES ($1, $2, $3, $4)",
            [reporter_id, reported_id, reason, description || null]
        );
        res.status(201).json({ message: "Report submitted. Our team will review it." });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;