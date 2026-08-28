/**
 * Chat Lock Manager
 * WhatsApp-style Private & Locked Chats utility
 */

// Simple deterministic hash for 4-digit PIN storage
export const hashPin = (pin) => {
    let hash = 0;
    const str = `coffeely_salt_${pin}_secure`;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
    }
    return hash.toString();
};

export const hasChatLockPin = (userId) => {
    if (!userId) return false;
    return !!localStorage.getItem(`chat_lock_pin_${userId}`);
};

export const setChatLockPin = (userId, pin) => {
    if (!userId || !pin) return false;
    localStorage.setItem(`chat_lock_pin_${userId}`, hashPin(pin));
    return true;
};

export const verifyChatLockPin = (userId, pin) => {
    if (!userId || !pin) return false;
    const storedHash = localStorage.getItem(`chat_lock_pin_${userId}`);
    if (!storedHash) return false;
    return storedHash === hashPin(pin);
};

export const getLockedChatIds = (userId) => {
    if (!userId) return [];
    try {
        const saved = localStorage.getItem(`locked_chats_${userId}`);
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        return [];
    }
};

export const isChatLocked = (userId, companionId) => {
    if (!userId || !companionId) return false;
    const lockedIds = getLockedChatIds(userId);
    return lockedIds.includes(companionId) || lockedIds.includes(String(companionId)) || lockedIds.includes(Number(companionId));
};

export const lockChat = (userId, companionId) => {
    if (!userId || !companionId) return false;
    const lockedIds = getLockedChatIds(userId);
    const idStr = String(companionId);
    if (!lockedIds.includes(idStr)) {
        lockedIds.push(idStr);
        localStorage.setItem(`locked_chats_${userId}`, JSON.stringify(lockedIds));
    }
    return true;
};

export const unlockChat = (userId, companionId) => {
    if (!userId || !companionId) return false;
    const lockedIds = getLockedChatIds(userId);
    const idStr = String(companionId);
    const filtered = lockedIds.filter(id => String(id) !== idStr);
    localStorage.setItem(`locked_chats_${userId}`, JSON.stringify(filtered));
    return true;
};

export const clearAllChatLocks = (userId) => {
    if (!userId) return;
    localStorage.removeItem(`locked_chats_${userId}`);
    localStorage.removeItem(`chat_lock_pin_${userId}`);
};
