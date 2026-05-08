const express = require('express');
const { pool } = require('../config/db');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/kyc/:userId', upload.single('id_document'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Koi document upload nahi hua!" });
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
        res.status(500).json({ error: "Server error" });
    }
});

router.post('/upload/:userId', upload.single('profile_pic'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Koi file upload nahi hui!" });
        const { userId } = req.params;
        const mediaUrl = req.file.path;
        await pool.query("UPDATE users SET profile_pic = $1 WHERE id = $2", [mediaUrl, userId]);
        res.status(200).json({ message: "Photo update ho gayi!", imageUrl: mediaUrl });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

router.post('/posts/:userId', upload.single('post_image'), async (req, res) => {
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
        res.status(500).json({ error: "Server error" });
    }
});

router.post('/chat-image', upload.single('image'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Koi photo select nahi ki!" });
        res.status(200).json({ imageUrl: req.file.path });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

router.get('/posts/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const posts = await pool.query("SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
        res.status(200).json(posts.rows);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

router.delete('/posts/:postId', async (req, res) => {
    try {
        const { postId } = req.params;
        await pool.query("DELETE FROM posts WHERE id = $1", [postId]);
        res.status(200).json({ message: "Post deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

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
                EXISTS(SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = p.user_id) as is_followed_by_me
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

router.post('/like', async (req, res) => {
    try {
        const { user_id, post_id } = req.body;
        const checkLike = await pool.query("SELECT * FROM likes WHERE user_id = $1 AND post_id = $2", [user_id, post_id]);

        if (checkLike.rows.length > 0) {
            await pool.query("DELETE FROM likes WHERE user_id = $1 AND post_id = $2", [user_id, post_id]);
            res.status(200).json({ message: "Post unliked", isLiked: false });
        } else {
            await pool.query("INSERT INTO likes (user_id, post_id) VALUES ($1, $2)", [user_id, post_id]);

            const postOwnerRes = await pool.query("SELECT user_id FROM posts WHERE id = $1", [post_id]);
            const postOwnerId = postOwnerRes.rows[0]?.user_id;

            if (postOwnerId && String(postOwnerId) !== String(user_id)) {
                await pool.query("INSERT INTO notifications (user_id, sender_id, type, post_id) VALUES ($1, $2, 'like', $3)", [postOwnerId, user_id, post_id]);
            }

            res.status(200).json({ message: "Post liked", isLiked: true });
        }
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

router.post('/comment', async (req, res) => {
    try {
        const { user_id, post_id, text } = req.body;
        if (!text || text.trim() === '') return res.status(400).json({ error: "Comment cannot be empty" });

        const newComment = await pool.query(
            "INSERT INTO comments (user_id, post_id, text) VALUES ($1, $2, $3) RETURNING *",
            [user_id, post_id, text]
        );

        const postOwnerRes = await pool.query("SELECT user_id FROM posts WHERE id = $1", [post_id]);
        const postOwnerId = postOwnerRes.rows[0]?.user_id;

        if (postOwnerId && String(postOwnerId) !== String(user_id)) {
            await pool.query("INSERT INTO notifications (user_id, sender_id, type, post_id) VALUES ($1, $2, 'comment', $3)", [postOwnerId, user_id, post_id]);
        }

        res.status(201).json(newComment.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

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

router.get('/notifications/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
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

module.exports = router;