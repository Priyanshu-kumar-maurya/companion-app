// Simple in-memory rate limiter — no extra package needed
// Limits: 10 requests per 60 seconds per IP

const rateLimitMap = new Map();

const rateLimiter = (maxRequests = 10, windowMs = 60 * 1000) => {
    return (req, res, next) => {
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
        const now = Date.now();
        const key = `${ip}`;

        if (!rateLimitMap.has(key)) {
            rateLimitMap.set(key, { count: 1, firstRequest: now });
            return next();
        }

        const entry = rateLimitMap.get(key);

        // Reset window if time has passed
        if (now - entry.firstRequest > windowMs) {
            rateLimitMap.set(key, { count: 1, firstRequest: now });
            return next();
        }

        // Increment count
        entry.count += 1;

        if (entry.count > maxRequests) {
            return res.status(429).json({
                error: "Too many login attempts. Please try again later."
            });
        }

        next();
    };
};

// Cleanup old entries every 5 minutes to prevent memory leak
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap.entries()) {
        if (now - entry.firstRequest > 2 * 60 * 1000) {
            rateLimitMap.delete(key);
        }
    }
}, 5 * 60 * 1000);

module.exports = rateLimiter;
