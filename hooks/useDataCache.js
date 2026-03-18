"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getCached, setCached } from "../lib/clientCache";

/**
 * Fetches data with localStorage + in-memory caching and version-token validation.
 *
 * On mount and on window focus, calls GET /api/version to check whether the
 * server's version hash matches the cached one. Re-fetches only when stale.
 *
 * @param {string} cacheKey   - Unique cache key, e.g. "student_schedule"
 * @param {string} versionKey - Key in the /api/version response, e.g. "schedule"
 * @param {string} fetchUrl   - Full API URL to fetch data from
 * @param {object} fetchOptions - Optional fetch options (method, headers, etc.)
 * @returns {{ data, isLoading, error, refetch }}
 */
export function useDataCache(cacheKey, versionKey, fetchUrl, fetchOptions = {}) {
  const cached = getCached(cacheKey);
  const [data, setData] = useState(cached?.data ?? null);
  const [isLoading, setIsLoading] = useState(!!fetchUrl && !cached);
  const [error, setError] = useState(null);
  const isFetching = useRef(false);

  const fetchFull = useCallback(async () => {
    if (!fetchUrl || isFetching.current) return;
    isFetching.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(fetchUrl, {
        credentials: "include",
        ...fetchOptions,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setCached(cacheKey, json, json.versionHash ?? null);
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [cacheKey, fetchUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkAndRefresh = useCallback(async () => {
    if (!fetchUrl) return;
    const current = getCached(cacheKey);
    if (!current) {
      fetchFull();
      return;
    }

    try {
      const res = await fetch("/api/version", { credentials: "include" });
      if (!res.ok) return; // version check failed — keep using cache silently
      const versions = await res.json();
      const serverHash = versions[versionKey];
      if (serverHash && serverHash !== current.versionHash) {
        fetchFull(); // cache is stale — re-fetch full data
      }
    } catch {
      // version check failed — keep using stale cache
    }
  }, [cacheKey, versionKey, fetchUrl, fetchFull]);

  useEffect(() => {
    checkAndRefresh();

    const onFocus = () => checkAndRefresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [checkAndRefresh]);

  return { data, isLoading, error, refetch: fetchFull };
}
