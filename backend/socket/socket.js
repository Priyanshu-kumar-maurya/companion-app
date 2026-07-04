const { pool } = require('../config/db');

const onlineUsers = new Map();

const broadcastOnlineUsers = async (io) => {
    try {
        const userIds = Array.from(onlineUsers.keys()).map(id => parseInt(id)).filter(id => !isNaN(id));
        if (userIds.length === 0) {
            io.emit("update_online_users", []);
            return;
        }
        const placeholders = userIds.map((_, i) => `$${i + 1}`).join(',');
        const result = await pool.query(
            `SELECT id FROM users WHERE id IN (${placeholders}) AND show_online = true`,
            userIds
        );
        const visibleOnlineUsers = result.rows.map(row => row.id.toString());
        io.emit("update_online_users", visibleOnlineUsers);
    } catch (err) {
        console.error("Broadcast online users error:", err);
        io.emit("update_online_users", Array.from(onlineUsers.keys()));
    }
};

module.exports = (io) => {
    io.on("connection", (socket) => {
        socket.on("user_connected", async (userId) => {
            onlineUsers.set(userId.toString(), socket.id);
            await broadcastOnlineUsers(io);
        });

        socket.on("join_own_room", (userId) => {
            socket.join(`user_${userId}`);
        });

        socket.on("join_room", (room) => {
            socket.join(room);
        });

        socket.on("send_message", async (data) => {
            try {
                const { checkProfanity, cleanText, checkContactInfo } = require('../middleware/contentFilter');
                let messageText = data.text || data.message || "";

                // Profanity check
                const profanityResult = checkProfanity(messageText);
                if (profanityResult.severity === 'high') {
                    socket.emit("message_blocked", {
                        error: "⚠️ Message blocked — please use respectful language.",
                        room: data.room
                    });
                    return;
                }
                if (!profanityResult.isClean) {
                    messageText = cleanText(messageText);
                }

                // Contact info detection (flag only, don't block)
                const contactCheck = checkContactInfo(messageText);

                const result = await pool.query(
                    "INSERT INTO messages (sender_id, receiver_id, text, image_url) VALUES ($1, $2, $3, $4) RETURNING id, created_at, is_read",
                    [data.sender_id, data.receiver_id, messageText, data.image_url || null]
                );
                const savedMessage = result.rows[0];
                data.id = savedMessage.id;
                data.text = messageText;
                data.message = messageText;
                data.created_at = savedMessage.created_at;
                data.is_read = savedMessage.is_read;
                if (contactCheck.hasContactInfo) data._contactShared = true;
                io.to(data.room).emit("receive_message", data);
                if (data.receiver_id) {
                    socket.to(data.receiver_id.toString()).emit("receive_message", data);
                }
            } catch (err) { console.error("send_message error:", err); }
        });

        socket.on("mark_messages_read", async (data) => {
            try {
                await pool.query("UPDATE messages SET is_read = true WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false", [data.sender_id, data.receiver_id]);
                io.to(data.room).emit("messages_read_update", data);
            } catch (error) { }
        });

        socket.on("initiate_call", (data) => {
            socket.to(data.room).emit("incoming_call", { type: data.type, caller_id: socket.id });
        });

        socket.on("accept_call", (data) => {
            socket.to(data.room).emit("call_accepted");
        });

        socket.on("reject_call", (data) => {
            socket.to(data.room).emit("call_rejected");
        });

        socket.on("end_call", (data) => {
            socket.to(data.room).emit("call_ended");
        });

        socket.on("edit_message", async (data) => {
            try {
                await pool.query("UPDATE messages SET text = $1 WHERE id = $2 AND sender_id = $3", [data.newText, data.messageId, data.sender_id]);
                io.to(data.room).emit("message_edited", { messageId: data.messageId, newText: data.newText });
            } catch (error) { }
        });

        socket.on("webrtc_offer", (data) => {
            socket.to(data.room).emit("webrtc_offer", data.offer);
        });

        socket.on("webrtc_answer", (data) => {
            socket.to(data.room).emit("webrtc_answer", data.answer);
        });

        socket.on("webrtc_ice_candidate", (data) => {
            socket.to(data.room).emit("webrtc_ice_candidate", data.candidate);
        });

        socket.on("delete_message", async (data) => {
            try {
                await pool.query("DELETE FROM messages WHERE id = $1 AND sender_id = $2", [data.messageId, data.sender_id]);
                io.to(data.room).emit("message_deleted", data.messageId);
            } catch (error) { }
        });

        socket.on("delete_for_me", async (data) => {
            try {
                await pool.query("UPDATE messages SET deleted_for = array_append(deleted_for, $1) WHERE id = $2", [data.userId, data.messageId]);
            } catch (error) { }
        });

        socket.on("send_booking_notification", (data) => {
            socket.to(`user_${data.receiver_id}`).emit("receive_booking_notification", data);
        });

        socket.on("active_status_changed", async () => {
            await broadcastOnlineUsers(io);
        });

        // ── SOS Emergency Alert — Broadcast to all admins ──
        socket.on("sos_alert", async (data) => {
            try {
                // Get all admin users
                const admins = await pool.query("SELECT id FROM users WHERE role = 'admin'");
                admins.rows.forEach(admin => {
                    io.to(`user_${admin.id}`).emit("sos_notification", {
                        ...data,
                        type: "sos",
                        message: `🚨 SOS Alert from ${data.userName}!`
                    });
                });
                console.log(`🚨 SOS Alert broadcast to ${admins.rows.length} admins`);
            } catch (err) {
                console.error("SOS socket error:", err);
            }
        });

        socket.on("disconnect", async () => {
            let disconnectedUserId = null;
            for (let [userId, socketId] of onlineUsers.entries()) {
                if (socketId === socket.id) {
                    disconnectedUserId = userId;
                    onlineUsers.delete(userId);
                    break;
                }
            }
            if (disconnectedUserId) {
                await broadcastOnlineUsers(io);
            }
        });
    });
};