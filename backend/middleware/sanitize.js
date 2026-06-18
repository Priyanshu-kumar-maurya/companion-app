// middleware/sanitize.js — XSS Prevention: strips dangerous HTML/script tags from all inputs

const DANGEROUS_PATTERNS = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
    /javascript\s*:/gi,
    /on\w+\s*=/gi,
    /<object[\s\S]*?>/gi,
    /<embed[\s\S]*?>/gi,
    /data\s*:\s*text\/html/gi,
    /vbscript\s*:/gi,
    /expression\s*\(/gi,
];

function sanitizeString(value) {
    if (typeof value !== 'string') return value;
    let clean = value;
    for (const pattern of DANGEROUS_PATTERNS) {
        clean = clean.replace(pattern, '');
    }
    return clean.trim();
}

function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const cleaned = {};
    for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (typeof val === 'string') cleaned[key] = sanitizeString(val);
        else if (Array.isArray(val)) cleaned[key] = val.map(i => typeof i === 'string' ? sanitizeString(i) : i);
        else if (typeof val === 'object' && val !== null) cleaned[key] = sanitizeObject(val);
        else cleaned[key] = val;
    }
    return cleaned;
}

const sanitizeInputs = (req, res, next) => {
    if (req.body && typeof req.body === 'object') req.body = sanitizeObject(req.body);
    if (req.query && typeof req.query === 'object') req.query = sanitizeObject(req.query);
    next();
};

module.exports = sanitizeInputs;
