import bcrypt from "bcrypt";

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
