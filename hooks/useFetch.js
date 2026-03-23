"use client";

/**
 * useFetch() hook
 * Wrapper around fetch() that automatically includes credentials (auth_token cookie)
 * and handles JSON parsing + error states.
 *
 * Usage:
 *   const { data, error, isLoading } = useFetch('/api/endpoint', { method: 'POST', body: {...} });
 */

import { useState, useCallback, useEffect, useRef } from "react";

let isRefreshing = false;
let refreshSubscribers = [];

function onRefreshed(success) {
  refreshSubscribers.forEach((callback) => callback(success));
  refreshSubscribers = [];
}

function doRefresh() {
  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshSubscribers.push(resolve);
    });
  }

  isRefreshing = true;
  return new Promise((resolve) => {
    fetch("/api/auth/refresh", { method: "POST" })
      .then((res) => {
        const success = res.ok;
        isRefreshing = false;
        onRefreshed(success);
        resolve(success);
      })
      .catch(() => {
        isRefreshing = false;
        onRefreshed(false);
        resolve(false);
      });
  });
}

export function useFetch(url, options = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(
    async (customOptions = {}) => {
      setIsLoading(true);
      setError(null);
      setData(null);

      const makeRequest = async () => {
        const mergedOptions = {
          ...options,
          ...customOptions,
          credentials: "include", // Always send auth_token/refresh_token cookies
          headers: {
            "Content-Type": "application/json",
            ...options.headers,
            ...(customOptions.headers || {}),
          },
        };

        // Convert body object to JSON string if needed
        if (mergedOptions.body && typeof mergedOptions.body === "object") {
          mergedOptions.body = JSON.stringify(mergedOptions.body);
        }

        const response = await fetch(url, mergedOptions);
        
        // Return 401s up to handle refresh
        if (response.status === 401 && url !== "/api/auth/refresh" && url !== "/api/auth/signin") {
          return { status: 401, response };
        }

        const result = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(result?.message ?? `HTTP ${response.status}`);
        }

        return { status: response.status, result };
      };

      try {
        let { status, result, response } = await makeRequest();

        // Handle Token Expiry
        if (status === 401) {
          const refreshed = await doRefresh();
          if (refreshed) {
            // Retry request
            const retryRes = await makeRequest();
            status = retryRes.status;
            result = retryRes.result;
            response = retryRes.response;

            if (status === 401) {
              // Still 401 after refresh -> log out
              window.location.href = "/signin";
              throw new Error("Session expired. Please sign in again.");
            }
          } else {
            // Refresh failed
            window.location.href = "/signin";
            throw new Error("Session expired. Please sign in again.");
          }
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

  // Auto-execute GET requests exactly once after mount
  const hasExecutedRef = useRef(false);
  useEffect(() => {
    if (!options.method && !hasExecutedRef.current) {
      hasExecutedRef.current = true;
      execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, error, isLoading, execute };
}
