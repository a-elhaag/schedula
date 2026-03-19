import { ObjectId } from "mongodb";

/**
 * Validate and convert a string to MongoDB ObjectId
 * Caches validation result to avoid re-validation
 */
const idCache = new Map();

export function validateAndParseId(idString, fieldName = "id") {
  if (!idString) {
    const err = new Error(`${fieldName} is required`);
    err.status = 400;
    throw err;
  }

  if (idCache.has(idString)) {
    const cached = idCache.get(idString);
    if (cached instanceof Error) throw cached;
    return cached;
  }

  try {
    if (!ObjectId.isValid(idString)) {
      throw new Error(`Invalid ${fieldName}`);
    }
    const objectId = new ObjectId(idString);
    idCache.set(idString, objectId);
    return objectId;
  } catch (error) {
    error.status = 400;
    idCache.set(idString, error);
    throw error;
  }
}

/**
 * Normalize and validate pagination parameters
 * Returns safe {limit, skip} with enforced bounds
 */
export function parsePagination(rawLimit, rawSkip, maxLimit = 500, defaultLimit = 50) {
  const limit = Math.min(
    Math.max(
      Math.floor(Number(rawLimit) || defaultLimit),
      1
    ),
    maxLimit
  );

  const skip = Math.max(
    Math.floor(Number(rawSkip) || 0),
    0
  );

  return { limit, skip };
}

/**
 * Parse query parameters from URL with type coercion
 */
export function parseSearchParams(searchParams, schema) {
  const result = {};

  for (const [key, type] of Object.entries(schema)) {
    const value = searchParams.get(key);
    if (!value) continue;

    switch (type) {
      case "string":
        result[key] = value;
        break;
      case "number":
        const num = Number(value);
        if (Number.isFinite(num)) result[key] = num;
        break;
      case "id":
        result[key] = validateAndParseId(value, key);
        break;
      default:
        result[key] = value;
    }
  }

  return result;
}

/**
 * Normalize time string (HH:MM) to minutes since midnight
 * Used for sorting schedule entries by time
 */
export function timeToMinutes(timeStr) {
  if (!timeStr) return Number.MAX_SAFE_INTEGER;
  const [hour = "99", minute = "99"] = String(timeStr).split(":");
  return Number(hour) * 60 + Number(minute);
}

/**
 * Clear validation cache (useful for testing)
 */
export function clearIdCache() {
  idCache.clear();
}
