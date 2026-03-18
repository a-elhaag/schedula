"use client";

import { useEffect, useState } from "react";

/**
 * useAuth() hook
 * Loads authenticated user data from a server endpoint.
 * This works with httpOnly auth cookies because the cookie is read server-side.
 */

export function useAuth() {
  const [auth, setAuth] = useState({
    userId: null,
    email: null,
    role: null,
    isLoading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadAuth() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          if (!cancelled) {
            setAuth({ userId: null, email: null, role: null, isLoading: false });
          }
          return;
        }

        const data = await response.json().catch(() => null);
        const user = data?.user;

        if (!cancelled && user) {
          setAuth({
            userId: user.id ?? null,
            email: user.email ?? null,
            role: user.role ?? null,
            isLoading: false,
          });
        }
      } catch {
        if (!cancelled) {
          setAuth({ userId: null, email: null, role: null, isLoading: false });
        }
      }
    }

    loadAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  return auth;
}
