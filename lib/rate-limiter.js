import Bottleneck from "bottleneck";
import { logger } from "@/lib/logger";

// Per-action config: limits that apply per unique identifier (IP / user ID)
const ACTION_CONFIG = {
  signin:              { minTime: 200, maxConcurrent: 1, reservoir: 5,  reservoirRefreshAmount: 5,  reservoirRefreshInterval: 60_000 },
  signup:              { minTime: 300, maxConcurrent: 1, reservoir: 3,  reservoirRefreshAmount: 3,  reservoirRefreshInterval: 60_000 },
  verifyEmail:         { minTime: 100, maxConcurrent: 2, reservoir: 10, reservoirRefreshAmount: 10, reservoirRefreshInterval: 60_000 },
  forgotPassword:      { minTime: 200, maxConcurrent: 1, reservoir: 5,  reservoirRefreshAmount: 5,  reservoirRefreshInterval: 60_000 },
  resendVerification:  { minTime: 200, maxConcurrent: 1, reservoir: 5,  reservoirRefreshAmount: 5,  reservoirRefreshInterval: 60_000 },
  invite:              { minTime: 100, maxConcurrent: 2, reservoir: 10, reservoirRefreshAmount: 10, reservoirRefreshInterval: 60_000 },
};

// Two-level map: action → identifier → Bottleneck instance
// Entries are evicted after TTL (2× the refresh interval) to avoid unbounded growth.
const _limiters = new Map(); // Map<action, Map<identifier, { limiter, timer }>>

const EVICT_TTL_MS = 120_000; // 2 minutes

function getLimiter(action, identifier) {
  if (!ACTION_CONFIG[action]) return null;

  if (!_limiters.has(action)) _limiters.set(action, new Map());
  const byId = _limiters.get(action);

  if (byId.has(identifier)) {
    const entry = byId.get(identifier);
    // Reset eviction timer on access
    clearTimeout(entry.timer);
    entry.timer = setTimeout(() => byId.delete(identifier), EVICT_TTL_MS);
    return entry.limiter;
  }

  const limiter = new Bottleneck(ACTION_CONFIG[action]);
  const timer   = setTimeout(() => byId.delete(identifier), EVICT_TTL_MS);
  byId.set(identifier, { limiter, timer });
  return limiter;
}

/**
 * Check if request is rate limited for a given action + identifier (IP / user ID).
 * @param {string} action     - Action name (e.g. 'signin', 'signup')
 * @param {string} identifier - IP address or user identifier
 * @returns {Promise<boolean>} true = allowed, false = rate limited
 */
export async function checkRateLimit(action, identifier) {
  // Allow disabling in test environments to prevent Bottleneck queue timeouts
  if (process.env.DISABLE_RATE_LIMIT === "true") return true;

  const limiter = getLimiter(action, identifier ?? "global");

  if (!limiter) {
    logger.warn({ action }, "Unknown rate limit action");
    return true; // Allow unknown actions
  }

  try {
    await limiter.schedule(() => Promise.resolve());
    return true;
  } catch (error) {
    logger.warn({ action, identifier, error: error.message }, "Rate limit exceeded");
    return false;
  }
}

/**
 * Get rate limit status for an action.
 * @param {string} action - Action name
 * @returns {Object} Status with remaining count
 */
export function getRateLimitStatus(action) {
  const byId = _limiters.get(action);
  if (!byId) return { remaining: Infinity, resetTime: null };
  // Return aggregate remaining across all identifiers (informational only)
  return { remaining: byId.size };
}
