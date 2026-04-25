// Module-level in-memory cache — survives re-renders, cleared on hard refresh
const memCache = new Map();

const PREFIX = "schedula_cache_";

/**
 * Returns the cached entry for `key`, or null if not found.
 * Checks in-memory first, then localStorage.
 * @returns {{ data: any, versionHash: string|null, cachedAt: number } | null}
 */
export function getCached(key) {
  if (memCache.has(key)) {
    console.debug("[Cache HIT]", key, "source: memory");
    return memCache.get(key);
  }

  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) {
      console.debug("[Cache MISS]", key, "→ fetching from server");
      return null;
    }
    const entry = JSON.parse(raw);
    console.debug("[Cache LOAD]", key, "source: localStorage", "versionHash:", entry.versionHash);
    memCache.set(key, entry);
    return entry;
  } catch {
    console.debug("[Cache MISS]", key, "→ localStorage error, fetching from server");
    return null;
  }
}

/**
 * Stores data in both in-memory cache and localStorage.
 */
export function setCached(key, data, versionHash) {
  const entry = { data, versionHash: versionHash ?? null, cachedAt: Date.now() };
  console.debug("[Cache SET]", key, "versionHash:", versionHash);
  memCache.set(key, entry);
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — in-memory cache still works
    console.debug("[Cache WARNING]", key, "localStorage unavailable");
  }
}

/**
 * Removes the cached entry from both in-memory cache and localStorage.
 */
export function clearCached(key) {
  console.debug("[Cache CLEAR]", key);
  memCache.delete(key);
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

/**
 * Clears ALL schedula_cache_* entries from memory and localStorage.
 * Call on signout to prevent stale data leaking between users.
 */
export function clearAllCached() {
  console.debug("[Cache CLEAR ALL]", `clearing ${memCache.size} in-memory entries`);
  memCache.clear();
  try {
    const keysToDelete = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) keysToDelete.push(k);
    }
    keysToDelete.forEach((k) => localStorage.removeItem(k));
    console.debug("[Cache CLEAR ALL]", `removed ${keysToDelete.length} localStorage entries`);
  } catch {
    // ignore
  }
}
