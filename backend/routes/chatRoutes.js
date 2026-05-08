const express = require('express');
const { pool } = require('../config/db');

const router = express.Router();

router.get('/chats/:userId', async (req, res) => {
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

module.exports = router;