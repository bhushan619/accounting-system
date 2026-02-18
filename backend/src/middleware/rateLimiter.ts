import rateLimit from 'express-rate-limit';

// Strict rate limiter for authentication endpoints
// 5 attempts per 15 minutes to prevent brute force attacks
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests, not just failed ones
  keyGenerator: (req) => {
    const email = req.body?.email || 'unknown';
    return email;
  }
});

// Password reset limiter - more restrictive
// 3 attempts per hour
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: { error: 'Too many password reset attempts. Please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Registration limiter - prevent account creation spam
// 3 registrations per hour per IP
export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { error: 'Too many registration attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// General API rate limiter
// 100 requests per 15 minutes
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false
});
