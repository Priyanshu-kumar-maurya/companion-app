/**
 * RentGF Profanity & Content Moderation System
 * - Filters Hindi + English abusive words
 * - Detects phone numbers, emails (to prevent off-platform contact)
 * - Returns clean version of text
 */

// ── Bad Words List (Hindi + English) ──────────────────────────
const PROFANITY_LIST = [
    // English
    'fuck', 'shit', 'ass', 'bitch', 'dick', 'pussy', 'cock', 'whore',
    'slut', 'bastard', 'damn', 'cunt', 'nigger', 'nigga', 'faggot',
    'retard', 'porn', 'nude', 'naked', 'sex', 'boobs', 'penis', 'vagina',
    // Hindi
    'madarchod', 'bhenchod', 'chutiya', 'gaand', 'lund', 'randi',
    'harami', 'kutta', 'kutti', 'saala', 'saali', 'bhosdike', 'bsdk',
    'mc', 'bc', 'gandu', 'chut', 'tatti', 'lavda', 'jhatu', 'behenchod',
    // Common variations
    'f*ck', 'f**k', 'sh*t', 's**t', 'b*tch', 'd*ck', 'a**', 'fck',
    'sht', 'btch', 'wtf', 'stfu', 'lmfao',
    // Leetspeak
    'fuk', 'phuck', 'phuk', 'azz', 'b1tch', 'd1ck', 'p0rn',
];

// ── Contact Info Patterns (prevent off-platform sharing) ──────
const PHONE_REGEX = /(\+91[\s-]?)?[6-9]\d{9}/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const SOCIAL_REGEX = /@[a-zA-Z0-9_.]{3,30}/g; // Instagram/Twitter handles

// ── Spam Patterns ─────────────────────────────────────────────
const SPAM_PATTERNS = [
    /whatsapp/i, /telegram/i, /signal\s?app/i,
    /call\s?me/i, /my\s?number/i, /mera\s?number/i,
    /pay\s?(me|karo)/i, /google\s?pay/i, /phone\s?pe/i, /paytm/i,
];

/**
 * Check if text contains profanity
 * @param {string} text
 * @returns {{ isClean: boolean, flaggedWords: string[], severity: 'none'|'low'|'medium'|'high' }}
 */
function checkProfanity(text) {
    if (!text || typeof text !== 'string') return { isClean: true, flaggedWords: [], severity: 'none' };

    const lower = text.toLowerCase().replace(/[^a-z0-9\s@.]/g, '');
    const words = lower.split(/\s+/);
    const flaggedWords = [];

    for (const word of words) {
        if (PROFANITY_LIST.includes(word)) {
            flaggedWords.push(word);
        }
    }

    // Also check for substrings (catches "yourefucking" etc.)
    for (const bad of PROFANITY_LIST) {
        if (bad.length >= 4 && lower.includes(bad) && !flaggedWords.includes(bad)) {
            flaggedWords.push(bad);
        }
    }

    const severity = flaggedWords.length === 0 ? 'none'
        : flaggedWords.length <= 1 ? 'low'
        : flaggedWords.length <= 3 ? 'medium' : 'high';

    return { isClean: flaggedWords.length === 0, flaggedWords, severity };
}

/**
 * Check if text contains contact info (phone, email, social handles)
 * @param {string} text
 * @returns {{ hasContactInfo: boolean, type: string|null, matches: string[] }}
 */
function checkContactInfo(text) {
    if (!text) return { hasContactInfo: false, type: null, matches: [] };

    const phones = text.match(PHONE_REGEX) || [];
    const emails = text.match(EMAIL_REGEX) || [];
    const socials = text.match(SOCIAL_REGEX) || [];

    if (phones.length > 0) return { hasContactInfo: true, type: 'phone', matches: phones };
    if (emails.length > 0) return { hasContactInfo: true, type: 'email', matches: emails };
    if (socials.length > 0) return { hasContactInfo: true, type: 'social', matches: socials };

    return { hasContactInfo: false, type: null, matches: [] };
}

/**
 * Check for spam patterns
 * @param {string} text
 * @returns {boolean}
 */
function isSpam(text) {
    if (!text) return false;
    return SPAM_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Clean text by replacing bad words with asterisks
 * @param {string} text
 * @returns {string}
 */
function cleanText(text) {
    if (!text) return text;
    let cleaned = text;

    for (const word of PROFANITY_LIST) {
        // Escape special regex chars in the word
        const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        try {
            const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
            cleaned = cleaned.replace(regex, '*'.repeat(word.length));
        } catch (e) {
            // If regex fails for this word, do simple replace
            cleaned = cleaned.split(new RegExp(word, 'gi')).join('*'.repeat(word.length));
        }
    }

    return cleaned;
}

/**
 * Express middleware: Moderate request body fields
 * Checks: message, comment, text, bio, description
 * IMPORTANT: Wrapped in try-catch — never crashes the server
 */
function moderateContent(req, res, next) {
    try {
        const fieldsToCheck = ['message', 'comment', 'text', 'bio', 'description', 'reason'];

        for (const field of fieldsToCheck) {
            if (req.body && req.body[field] && typeof req.body[field] === 'string') {
                const profanityCheck = checkProfanity(req.body[field]);

                if (profanityCheck.severity === 'high') {
                    return res.status(400).json({
                        error: "⚠️ Aapka message bahut inappropriate hai. Please respectful language use karein.",
                        moderation: { type: 'profanity', severity: 'high' }
                    });
                }

                if (profanityCheck.severity === 'medium') {
                    req.body[field] = cleanText(req.body[field]);
                    req.body._moderated = true;
                }

                if (field === 'message') {
                    const contactCheck = checkContactInfo(req.body[field]);
                    if (contactCheck.hasContactInfo) {
                        req.body._contactShared = true;
                        req.body._contactType = contactCheck.type;
                    }
                    if (isSpam(req.body[field])) {
                        req.body._isSpam = true;
                    }
                }
            }
        }
    } catch (err) {
        // NEVER block requests due to moderation errors
        console.error('Content moderation error (non-blocking):', err.message);
    }

    next();
}

module.exports = {
    checkProfanity,
    checkContactInfo,
    isSpam,
    cleanText,
    moderateContent,
    PROFANITY_LIST
};
