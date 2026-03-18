import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key-change-in-prod";
const JWT_ALG = "HS256";
const encoder = new TextEncoder();
const secret = encoder.encode(JWT_SECRET);

/**
 * Verify a JWT token in the Edge runtime using jose.
 * @param {string} token - JWT token
 * @returns {Promise<object|null>} - Decoded payload or null if invalid/expired
 */
export async function verifyTokenEdge(token) {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: [JWT_ALG],
    });

    return payload;
  } catch (error) {
    return null;
  }
}
