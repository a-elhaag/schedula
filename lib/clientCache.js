// Module-level in-memory cache — survives re-renders, cleared on hard refresh
const memCache = new Map();

const PREFIX = "schedula_cache_";

/**
 * Returns the cached entry for `key`, or null if not found.
 * Checks in-memory first, then localStorage.
 * @returns {{ data: any, versionHash: string|null, cachedAt: number } | null}
 */
export function getCached(key) {
  if (memCache.has(key)) return memCache.get(key);

  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    memCache.set(key, entry);
    return entry;
  } catch {
    return null;
  }
}

/**
 * Stores data in both in-memory cache and localStorage.
 */
export function setCached(key, data, versionHash) {
  const entry = { data, versionHash: versionHash ?? null, cachedAt: Date.now() };
  memCache.set(key, entry);
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — in-memory cache still works
  }
}

/**
 * Removes the cached entry from both in-memory cache and localStorage.
 */
export function clearCached(key) {
  memCache.delete(key);
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}
