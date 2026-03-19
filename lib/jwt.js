import jwt from "jsonwebtoken";

const JWT_TTL = 30 * 60; // 30 minutes in seconds

function getResolvedSecret() {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set in production.");
  }

  return jwtSecret || "dev-secret-key-change-in-prod";
}

/**
 * Generate a JWT token with 30-minute TTL.
 * @param {object} payload - { sub, email, role, institution }
 * @returns {string} - JWT token
 */
export function signToken(payload) {
  return jwt.sign(payload, getResolvedSecret(), {
    expiresIn: JWT_TTL,
    algorithm: "HS256",
  });
}

/**
 * Verify a JWT token and return its payload.
 * @param {string} token - JWT token
 * @returns {object|null} - Decoded payload or null if invalid/expired
 */
export function verifyToken(token) {
  const secret = getResolvedSecret();

  try {
    return jwt.verify(token, secret, { algorithms: ["HS256"] });
  } catch (error) {
    return null;
  }
}
