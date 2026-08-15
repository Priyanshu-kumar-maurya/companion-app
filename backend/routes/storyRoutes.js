const express = require('express');
const { pool } = require('../config/db');
const authenticateToken = require('../middleware/auth');
const { moderateContent } = require('../middleware/contentFilter');

const router = express.Router();

// ─── 1. GET ALL ACTIVE STORIES (Last 24 Hours) ────────────────
router.get('/stories', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT s.id, s.user_id, s.media_url, s.caption, s.created_at, s.expires_at,
                   u.name as user_name, u.username as user_username, u.profile_pic as user_pic, u.role as user_role
            FROM stories s
            JOIN users u ON s.user_id = u.id
            WHERE s.expires_at > NOW()
              AND u.is_frozen = false
              AND u.is_platform_blocked = false
            ORDER BY s.created_at ASC
        `);

        // Group stories by user for Instagram-style story rings
        const storiesByUser = {};
        result.rows.forEach(story => {
            if (!storiesByUser[story.user_id]) {
                storiesByUser[story.user_id] = {
                    user_id: story.user_id,
                    user_name: story.user_name,
                    user_username: story.user_username,
                    user_pic: story.user_pic,
                    user_role: story.user_role,
                    latest_created_at: story.created_at,
                    items: []
                };
            }
            storiesByUser[story.user_id].latest_created_at = story.created_at;
            storiesByUser[story.user_id].items.push({
                id: story.id,
                media_url: story.media_url,
                caption: story.caption,
                created_at: story.created_at,
                expires_at: story.expires_at
            });
        });

        // Convert dictionary to array sorted by newest story first
        const formatted = Object.values(storiesByUser).sort((a, b) => new Date(b.latest_created_at) - new Date(a.latest_created_at));

        res.status(200).json(formatted);
    } catch (err) {
        console.error("Get stories error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// ─── 2. POST A NEW STORY (Auth Required) ──────────────────────
router.post('/stories', authenticateToken, moderateContent, async (req, res) => {
    try {
        const { media_url, caption } = req.body;

        if (!media_url || !media_url.trim()) {
            return res.status(400).json({ error: "Media URL is required to post a story." });
        }

        const newStory = await pool.query(
            "INSERT INTO stories (user_id, media_url, caption) VALUES ($1, $2, $3) RETURNING *",
            [req.user.id, media_url.trim(), caption ? caption.trim() : null]
        );

        res.status(201).json({
            message: "Story posted successfully! Active for 24 hours.",
            story: newStory.rows[0]
        });
    } catch (err) {
        console.error("Create story error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// ─── 3. DELETE A STORY (Auth Required + Ownership) ────────────
router.delete('/stories/:storyId', authenticateToken, async (req, res) => {
    try {
        const { storyId } = req.params;

        const storyCheck = await pool.query("SELECT * FROM stories WHERE id = $1", [storyId]);
        if (storyCheck.rows.length === 0) {
            return res.status(404).json({ error: "Story not found." });
        }

        // Ownership or admin check
        if (parseInt(storyCheck.rows[0].user_id) !== parseInt(req.user.id) && req.user.role !== 'admin') {
            return res.status(403).json({ error: "Forbidden: You can only delete your own stories." });
        }

        await pool.query("DELETE FROM stories WHERE id = $1", [storyId]);
        res.status(200).json({ message: "Story deleted." });
    } catch (err) {
        console.error("Delete story error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
