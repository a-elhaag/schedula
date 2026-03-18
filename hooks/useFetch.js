"use client";

/**
 * useFetch() hook
 * Wrapper around fetch() that automatically includes credentials (auth_token cookie)
 * and handles JSON parsing + error states.
 *
 * Usage:
 *   const { data, error, isLoading } = useFetch('/api/endpoint', { method: 'POST', body: {...} });
 */

import { useState, useCallback } from "react";

export function useFetch(url, options = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(
    async (customOptions = {}) => {
      setIsLoading(true);
      setError(null);
      setData(null);

      try {
        const mergedOptions = {
          ...options,
          ...customOptions,
          credentials: "include", // Always send auth_token cookie
          headers: {
            "Content-Type": "application/json",
            ...options.headers,
            ...customOptions.headers,
          },
        };

        // Convert body object to JSON string if needed
        if (mergedOptions.body && typeof mergedOptions.body === "object") {
          mergedOptions.body = JSON.stringify(mergedOptions.body);
        }

        const response = await fetch(url, mergedOptions);
        const result = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(result?.message ?? `HTTP ${response.status}`);
        }

        setData(result);
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [url, options],
  );

  // Auto-execute if no method specified (GET by default)
  const [hasExecuted, setHasExecuted] = useState(false);
  if (!options.method && !hasExecuted) {
    setHasExecuted(true);
    execute();
  }

  return { data, error, isLoading, execute };
}
