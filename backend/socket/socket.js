const { pool } = require('../config/db');
let contentFilter;
try { contentFilter = require('../middleware/contentFilter'); } catch(e) { console.error('ContentFilter load failed:', e.message); }
const { sendPushNotification } = require('../routes/pushRoutes');

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
            if (userId) {
                socket.join(`user_${userId}`);
                socket.join(userId.toString());
            }
        });

        socket.on("join_room", (room) => {
            if (room) {
                socket.join(room);
                if (room.startsWith("chat_")) {
                    socket.join(room.replace("chat_", ""));
                } else {
                    socket.join(`chat_${room}`);
                }
            }
        });

        socket.on("send_message", async (data) => {
            try {
                let messageText = data.text || data.message || "";

                // Profanity check (non-blocking)
                try {
                    if (contentFilter) {
                        const profanityResult = contentFilter.checkProfanity(messageText);
                        if (profanityResult.severity === 'high') {
                            socket.emit("message_blocked", {
                                error: "⚠️ Message blocked — please use respectful language.",
                                room: data.room
                            });
                            return;
                        }
                        if (!profanityResult.isClean) {
                            messageText = contentFilter.cleanText(messageText);
                        }
                    }
                } catch (modErr) { console.error('Chat moderation error:', modErr.message); }

                const result = await pool.query(
                    "INSERT INTO messages (sender_id, receiver_id, text, image_url, audio_url) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at, is_read",
                    [data.sender_id, data.receiver_id, messageText, data.image_url || null, data.audio_url || null]
                );
                const savedMessage = result.rows[0];
                data.id = savedMessage.id;
                data.text = messageText;
                data.message = messageText;
                data.created_at = savedMessage.created_at;
                data.is_read = savedMessage.is_read;

                // Lookup sender profile details
                const senderDetails = await pool.query(
                    "SELECT name, profile_pic FROM users WHERE id = $1",
                    [data.sender_id]
                );
                if (senderDetails.rows.length > 0) {
                    data.sender_name = senderDetails.rows[0].name;
                    data.sender_pic = senderDetails.rows[0].profile_pic;
                }

                io.to(data.room).emit("receive_message", data);
                if (data.receiver_id) {
                    io.to(`user_${data.receiver_id}`).emit("receive_message", data);
                    io.to(data.receiver_id.toString()).emit("receive_message", data);
                    // Trigger Web Push Notification
                    sendPushNotification(data.receiver_id, {
                        title: `💬 ${data.sender_name || 'Companion'}`,
                        body: data.image_url ? '📷 Shared a photo' : (data.audio_url ? '🎤 Sent a voice note' : messageText),
                        icon: data.sender_pic || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
                        url: '/#chat',
                        tag: `chat_${data.sender_id}`
                    });
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
            const payload = {
                type: data.type,
                caller_id: socket.id,
                caller_name: data.caller_name || 'Partner',
                caller_pic: data.caller_pic || '',
                room: data.room,
                caller_user_id: data.caller_user_id
            };
            socket.to(data.room).emit("incoming_call", payload);
            if (data.receiver_id) {
                socket.to(`user_${data.receiver_id}`).emit("incoming_call", payload);
                // Trigger Web Push Notification for incoming call
                sendPushNotification(data.receiver_id, {
                    title: `📞 Incoming ${data.type === 'video' ? 'Video' : 'Voice'} Call`,
                    body: `${data.caller_name || 'Someone'} is calling you...`,
                    icon: data.caller_pic || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
                    url: '/#chat',
                    tag: `call_${data.caller_user_id}`
                });
            }

            const isReceiverOnline = data.receiver_id && onlineUsers.has(data.receiver_id.toString());
            socket.emit("call_status_update", {
                isOnline: isReceiverOnline,
                statusText: isReceiverOnline ? "Ringing..." : "Calling..."
            });
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
            io.to(`user_${data.receiver_id}`).emit("receive_booking_notification", data);
            io.to(data.receiver_id.toString()).emit("receive_booking_notification", data);
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

        socket.on("typing", (data) => {
            socket.to(data.room).emit("partner_typing", data);
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