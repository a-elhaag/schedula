"use client";

import { useEffect, useState } from "react";

/**
 * useAuth() hook
 * Reads the JWT token from auth_token cookie and decodes it client-side.
 * Returns user info and loading state.
 *
 * NOTE: This is for convenience only. The JWT is still validated server-side
 * by middleware.js. Never trust the client-side decoded values for security.
 */

function decodeJWT(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const decoded = JSON.parse(atob(parts[1]));
    return decoded;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [auth, setAuth] = useState({
    userId: null,
    email: null,
    role: null,
    isLoading: true,
  });

  useEffect(() => {
    // Read auth_token cookie
    const cookies = document.cookie.split("; ").reduce((acc, cookie) => {
      const [key, value] = cookie.split("=");
      acc[key] = value;
      return acc;
    }, {});

    const token = cookies.auth_token;

    if (token) {
      const decoded = decodeJWT(token);
      if (decoded) {
        setAuth({
          userId: decoded.sub,
          email: decoded.email,
          role: decoded.role,
          isLoading: false,
        });
      } else {
        setAuth({ userId: null, email: null, role: null, isLoading: false });
      }
    } else {
      setAuth({ userId: null, email: null, role: null, isLoading: false });
    }
  }, []);

  return auth;
}
