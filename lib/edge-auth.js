import { jwtVerify } from "jose";

const JWT_ALG = "HS256";
const encoder = new TextEncoder();

function getSecret() {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set in production.");
  }

  return encoder.encode(jwtSecret || "dev-secret-key-change-in-prod");
}

/**
 * Verify a JWT token in the Edge runtime using jose.
 * @param {string} token - JWT token
 * @returns {Promise<object|null>} - Decoded payload or null if invalid/expired
 */
export async function verifyTokenEdge(token) {
  const secret = getSecret();

  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: [JWT_ALG],
    });

    return payload;
  } catch (error) {
    return null;
  }
}
