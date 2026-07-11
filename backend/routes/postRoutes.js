const express = require('express');
const { pool } = require('../config/db');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middleware/auth');
const upload = require('../middleware/upload');
const { checkProfanity, cleanText, moderateContent } = require('../middleware/contentFilter');

const router = express.Router();

// ─── KYC UPLOAD — AUTH REQUIRED + OWNERSHIP ─────────────────
router.post('/kyc/:userId', authenticateToken, upload.single('id_document'), async (req, res) => {
    try {
        const { userId } = req.params;

        // Only the user themselves can upload their own KYC
        if (parseInt(req.user.id) !== parseInt(userId)) {
            return res.status(403).json({ error: "Forbidden: Sirf apna KYC upload kar sakte ho." });
        }

        if (!req.file) return res.status(400).json({ error: "Koi document upload nahi hua!" });

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

// ─── PROFILE PIC UPLOAD — AUTH REQUIRED + OWNERSHIP ─────────
router.post('/upload/:userId', authenticateToken, upload.single('profile_pic'), async (req, res) => {
    try {
        const { userId } = req.params;

        if (parseInt(req.user.id) !== parseInt(userId)) {
            return res.status(403).json({ error: "Forbidden: Sirf apni profile pic update kar sakte ho." });
        }

        if (!req.file) return res.status(400).json({ error: "Koi file upload nahi hui!" });

        const mediaUrl = req.file.path;
        await pool.query("UPDATE users SET profile_pic = $1 WHERE id = $2", [mediaUrl, userId]);
        res.status(200).json({ message: "Photo update ho gayi!", imageUrl: mediaUrl });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// ─── CREATE POST — AUTH REQUIRED + OWNERSHIP ─────────────────
router.post('/posts/:userId', authenticateToken, upload.single('post_image'), async (req, res) => {
    try {
        const { userId } = req.params;

        if (parseInt(req.user.id) !== parseInt(userId)) {
            return res.status(403).json({ error: "Forbidden: Tum sirf apni post bana sakte ho." });
        }

        if (!req.file) return res.status(400).json({ error: "Photo select karna zaroori hai!" });

        const { caption } = req.body;

        // Sanitize caption — strip HTML
        let safeCaption = (caption || "").replace(/<[^>]*>/g, '').slice(0, 500);

        // Profanity check (non-blocking — if it fails, just use original caption)
        try {
            const profCheck = checkProfanity(safeCaption);
            if (profCheck.severity === 'high') {
                return res.status(400).json({ error: "⚠️ Caption mein inappropriate language hai. Please clean caption likhein." });
            }
            if (!profCheck.isClean) safeCaption = cleanText(safeCaption);
        } catch (modErr) {
            console.error('Post moderation error (non-blocking):', modErr.message);
        }

        const mediaUrl = req.file.path;
        const newPost = await pool.query(
            "INSERT INTO posts (user_id, image_url, caption) VALUES ($1, $2, $3) RETURNING *",
            [userId, mediaUrl, safeCaption]
        );
        res.status(201).json({ message: "Post live ho gayi!", post: newPost.rows[0] });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// ─── CHAT IMAGE UPLOAD — AUTH REQUIRED ───────────────────────
router.post('/chat-image', authenticateToken, upload.single('image'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Koi photo select nahi ki!" });
        res.status(200).json({ imageUrl: req.file.path });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// ─── GET POSTS BY USER — Public ───────────────────────────────
router.get('/posts/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const posts = await pool.query("SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
        res.status(200).json(posts.rows);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// ─── GET SINGLE POST DETAIL — OPTIONAL AUTH ─────────────────
router.get('/posts/detail/:postId', async (req, res) => {
    try {
        const { postId } = req.params;
        
        let currentUserId = null;
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                currentUserId = decoded.id;
            } catch (e) {}
        }

        const postQuery = `
            SELECT p.*,
                   u.name as user_name, u.profile_pic as user_pic, u.role as user_role, u.city as user_city,
                   COALESCE((SELECT COUNT(*) FROM likes WHERE post_id = p.id), 0) as total_likes,
                   EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) as is_liked_by_me
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = $2
        `;
        const result = await pool.query(postQuery, [currentUserId || null, postId]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Post not found." });
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error("Get post detail error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// ─── DELETE POST — AUTH REQUIRED + OWNERSHIP ─────────────────
router.delete('/posts/:postId', authenticateToken, async (req, res) => {
    try {
        const { postId } = req.params;

        // Verify the post belongs to the requesting user (or admin can delete any)
        const postResult = await pool.query("SELECT user_id FROM posts WHERE id = $1", [postId]);
        if (postResult.rows.length === 0) return res.status(404).json({ error: "Post nahi mili." });

        const postOwnerId = postResult.rows[0].user_id;
        if (req.user.role !== 'admin' && parseInt(req.user.id) !== parseInt(postOwnerId)) {
            return res.status(403).json({ error: "Forbidden: Tum sirf apni post delete kar sakte ho." });
        }

        await pool.query("DELETE FROM likes WHERE post_id = $1", [postId]);
        await pool.query("DELETE FROM comments WHERE post_id = $1", [postId]);
        await pool.query("DELETE FROM notifications WHERE post_id = $1", [postId]);
        await pool.query("DELETE FROM posts WHERE id = $1", [postId]);
        res.status(200).json({ message: "Post deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// ─── GET FEED — Public (with optional currentUserId) ─────────
router.get('/feed', async (req, res) => {
    try {
        const { currentUserId } = req.query;
        const feedQuery = `
            SELECT 
                p.id, p.image_url, p.caption, p.created_at,
                u.id as user_id, u.name as user_name, u.profile_pic as user_pic, u.role as user_role,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as total_likes,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as total_comments,
                EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) as is_liked_by_me,
                EXISTS(SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = p.user_id) as is_followed_by_me,
                EXISTS(SELECT 1 FROM saved_posts WHERE post_id = p.id AND user_id = $1) as is_saved_by_me
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

// ─── LIKE / UNLIKE — AUTH REQUIRED ───────────────────────────
router.post('/like', authenticateToken, async (req, res) => {
    try {
        const { post_id } = req.body;
        const user_id = req.user.id; // Always use authenticated user's ID

        if (!post_id) return res.status(400).json({ error: "post_id required hai." });

        const checkLike = await pool.query("SELECT * FROM likes WHERE user_id = $1 AND post_id = $2", [user_id, post_id]);

        if (checkLike.rows.length > 0) {
            await pool.query("DELETE FROM likes WHERE user_id = $1 AND post_id = $2", [user_id, post_id]);
            res.status(200).json({ message: "Post unliked", isLiked: false });
        } else {
            await pool.query("INSERT INTO likes (user_id, post_id) VALUES ($1, $2)", [user_id, post_id]);

            const postOwnerRes = await pool.query("SELECT user_id FROM posts WHERE id = $1", [post_id]);
            const postOwnerId = postOwnerRes.rows[0]?.user_id;

            if (postOwnerId && String(postOwnerId) !== String(user_id)) {
                await pool.query(
                    "INSERT INTO notifications (user_id, sender_id, type, post_id) VALUES ($1, $2, 'like', $3)",
                    [postOwnerId, user_id, post_id]
                );
            }

            res.status(200).json({ message: "Post liked", isLiked: true });
        }
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// ─── ADD COMMENT — AUTH REQUIRED ─────────────────────────────
router.post('/comment', authenticateToken, moderateContent, async (req, res) => {
    try {
        const { post_id, text } = req.body;
        const user_id = req.user.id; // Always use authenticated user's ID

        if (!text || text.trim() === '') return res.status(400).json({ error: "Comment cannot be empty" });
        if (!post_id) return res.status(400).json({ error: "post_id required hai." });

        // Sanitize comment text
        const safeText = text.replace(/<[^>]*>/g, '').trim().slice(0, 1000);

        const newComment = await pool.query(
            "INSERT INTO comments (user_id, post_id, text) VALUES ($1, $2, $3) RETURNING *",
            [user_id, post_id, safeText]
        );

        const postOwnerRes = await pool.query("SELECT user_id FROM posts WHERE id = $1", [post_id]);
        const postOwnerId = postOwnerRes.rows[0]?.user_id;

        if (postOwnerId && String(postOwnerId) !== String(user_id)) {
            await pool.query(
                "INSERT INTO notifications (user_id, sender_id, type, post_id) VALUES ($1, $2, 'comment', $3)",
                [postOwnerId, user_id, post_id]
            );
        }

        res.status(201).json(newComment.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// ─── GET COMMENTS — Public ────────────────────────────────────
router.get('/comments/:postId', async (req, res) => {
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

// ─── GET NOTIFICATIONS — AUTH REQUIRED ───────────────────────
router.get('/notifications/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;

        // Users can only see their own notifications
        if (parseInt(req.user.id) !== parseInt(userId)) {
            return res.status(403).json({ error: "Forbidden: Sirf apni notifications dekh sakte ho." });
        }

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

// ─── SAVE / UNSAVE POST — AUTH REQUIRED ─────────────────────
router.post('/posts/save', authenticateToken, async (req, res) => {
    try {
        const { post_id } = req.body;
        const user_id = req.user.id;

        if (!post_id) return res.status(400).json({ error: "post_id required." });

        const checkSave = await pool.query("SELECT * FROM saved_posts WHERE user_id = $1 AND post_id = $2", [user_id, post_id]);

        if (checkSave.rows.length > 0) {
            await pool.query("DELETE FROM saved_posts WHERE user_id = $1 AND post_id = $2", [user_id, post_id]);
            res.status(200).json({ message: "Post unsaved", isSaved: false });
        } else {
            await pool.query("INSERT INTO saved_posts (user_id, post_id) VALUES ($1, $2)", [user_id, post_id]);
            res.status(200).json({ message: "Post saved", isSaved: true });
        }
    } catch (err) {
        console.error("Save post error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// ─── GET SAVED POSTS — AUTH REQUIRED ─────────────────────────
router.get('/posts/saved', authenticateToken, async (req, res) => {
    try {
        const user_id = req.user.id;
        const savedPostsQuery = `
            SELECT 
                p.id, p.image_url, p.caption, p.created_at,
                u.id as user_id, u.name as user_name, u.profile_pic as user_pic, u.role as user_role,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as total_likes,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as total_comments,
                EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = $1) as is_liked_by_me,
                true as is_saved_by_me
            FROM saved_posts sp
            JOIN posts p ON sp.post_id = p.id
            JOIN users u ON p.user_id = u.id
            WHERE sp.user_id = $1
            ORDER BY sp.created_at DESC;
        `;
        const result = await pool.query(savedPostsQuery, [user_id]);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Get saved posts error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// ─── GET LIKED POSTS — AUTH REQUIRED ─────────────────────────
router.get('/posts/liked', authenticateToken, async (req, res) => {
    try {
        const user_id = req.user.id;
        const likedPostsQuery = `
            SELECT 
                p.id, p.image_url, p.caption, p.created_at,
                u.id as user_id, u.name as user_name, u.profile_pic as user_pic, u.role as user_role,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as total_likes,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as total_comments,
                true as is_liked_by_me,
                EXISTS(SELECT 1 FROM saved_posts WHERE post_id = p.id AND user_id = $1) as is_saved_by_me
            FROM likes l
            JOIN posts p ON l.post_id = p.id
            JOIN users u ON p.user_id = u.id
            WHERE l.user_id = $1
            ORDER BY l.created_at DESC;
        `;
        const result = await pool.query(likedPostsQuery, [user_id]);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Get liked posts error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;