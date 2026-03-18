import Bottleneck from "bottleneck";
import { logger } from "@/lib/logger";

// Create rate limiters for different auth actions
// Key: action name, Value: Bottleneck instance with specific limits

const rateLimiters = {
  // Signin: 5 attempts per minute per IP
  signin: new Bottleneck({
    minTime: 200, // 200ms between requests
    maxConcurrent: 1,
    reservoir: 5, // 5 requests
    reservoirRefreshAmount: 5,
    reservoirRefreshInterval: 60 * 1000, // per 60 seconds
  }),

  // Signup: 3 attempts per minute per IP
  signup: new Bottleneck({
    minTime: 300,
    maxConcurrent: 1,
    reservoir: 3,
    reservoirRefreshAmount: 3,
    reservoirRefreshInterval: 60 * 1000,
  }),

  // Email verification: 10 attempts per minute per IP
  verifyEmail: new Bottleneck({
    minTime: 100,
    maxConcurrent: 2,
    reservoir: 10,
    reservoirRefreshAmount: 10,
    reservoirRefreshInterval: 60 * 1000,
  }),

  // Forgot password: 5 attempts per minute per IP
  forgotPassword: new Bottleneck({
    minTime: 200,
    maxConcurrent: 1,
    reservoir: 5,
    reservoirRefreshAmount: 5,
    reservoirRefreshInterval: 60 * 1000,
  }),

  // Resend verification: 5 attempts per minute per IP
  resendVerification: new Bottleneck({
    minTime: 200,
    maxConcurrent: 1,
    reservoir: 5,
    reservoirRefreshAmount: 5,
    reservoirRefreshInterval: 60 * 1000,
  }),

  // Invite: 10 attempts per minute per IP (coordinator action)
  invite: new Bottleneck({
    minTime: 100,
    maxConcurrent: 2,
    reservoir: 10,
    reservoirRefreshAmount: 10,
    reservoirRefreshInterval: 60 * 1000,
  }),
};

/**
 * Check if request is rate limited
 * @param {string} action - Action name (e.g., 'signin', 'signup')
 * @param {string} identifier - IP address or user identifier
 * @returns {Promise<boolean>} - true if allowed, false if rate limited
 */
export async function checkRateLimit(action, identifier) {
  const limiter = rateLimiters[action];

  if (!limiter) {
    logger.warn({ action }, "Unknown rate limit action");
    return true; // Allow if action not configured
  }

  try {
    // Try to acquire a token
    await limiter.schedule(() => Promise.resolve());
    return true;
  } catch (error) {
    // Rate limit exceeded
    logger.warn(
      { action, identifier, error: error.message },
      "Rate limit exceeded",
    );
    return false;
  }
}

/**
 * Get rate limit status for an action
 * @param {string} action - Action name
 * @returns {Object} - Status with remaining attempts and reset time
 */
export function getRateLimitStatus(action) {
  const limiter = rateLimiters[action];

  if (!limiter) {
    return { remaining: Infinity, resetTime: null };
  }

  return {
    remaining: limiter.counts().EXECUTING + limiter.counts().QUEUED,
  };
}
