/**
 * lib/auth.js
 * JWT token generation, verification, and password hashing utilities.
 * 30-minute TTL for access tokens, httpOnly cookie storage.
 */

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key-change-in-prod";
const JWT_TTL = 30 * 60; // 30 minutes in seconds

/**
 * Generate a JWT token with 30-minute TTL.
 * @param {object} payload - { sub, email, role, institution }
 * @returns {string} - JWT token
 */
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
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
  try {
    return jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
  } catch (error) {
    return null;
  }
}

/**
 * Hash a plaintext password using bcrypt.
 * @param {string} password - Plaintext password
 * @returns {Promise<string>} - Hashed password
 */
export async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Compare a plaintext password with a bcrypt hash.
 * @param {string} password - Plaintext password
 * @param {string} hash - Bcrypt hash from database
 * @returns {Promise<boolean>} - True if password matches
 */
export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a secure random token for email verification or invites.
 * @param {number} [bytes=32] - Token size in bytes.
 * @returns {string} - URL-safe token string
 */
export function generateToken(bytes = 32) {
  return crypto
    .randomBytes(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
