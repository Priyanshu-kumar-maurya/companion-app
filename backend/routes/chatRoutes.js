const express = require('express');
const { pool } = require('../config/db');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

router.get('/chats/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const query = `
            SELECT DISTINCT u.id, u.name, u.role, u.profile_pic
            FROM messages m
            JOIN users u ON (u.id = m.sender_id OR u.id = m.receiver_id)
            WHERE (m.sender_id = $1 OR m.receiver_id = $1)
            AND u.id != $1
            AND EXISTS (
                SELECT 1 FROM messages m2 
                WHERE ((m2.sender_id = $1 AND m2.receiver_id = u.id) OR (m2.sender_id = u.id AND m2.receiver_id = $1))
                AND NOT ($1 = ANY(COALESCE(m2.deleted_for, '{}')))
            )
        `;
        const chatHistory = await pool.query(query, [userId]);
        res.status(200).json(chatHistory.rows);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

router.get('/messages/:user1/:user2', async (req, res) => {
    try {
        const { user1, user2 } = req.params;
        const query = `
            SELECT id, sender_id, receiver_id, text AS message, image_url, created_at, is_read 
            FROM messages 
            WHERE ((sender_id = $1 AND receiver_id = $2) 
               OR (sender_id = $2 AND receiver_id = $1))
            AND NOT ($1 = ANY(COALESCE(deleted_for, '{}')))
            ORDER BY created_at ASC
        `;
        const result = await pool.query(query, [user1, user2]);
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// Clear Chat Messages Route
router.post('/messages/clear', authenticateToken, async (req, res) => {
    try {
        const { target_id } = req.body;
        const my_id = req.user.id;

        if (!target_id) return res.status(400).json({ error: "target_id required." });

        await pool.query(
            `UPDATE messages 
             SET deleted_for = array_append(COALESCE(deleted_for, '{}'), $1) 
             WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))
             AND NOT ($1 = ANY(COALESCE(deleted_for, '{}')))`,
            [my_id, target_id]
        );

        res.status(200).json({ message: "Chat cleared successfully." });
    } catch (err) {
        console.error("Clear chat error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;