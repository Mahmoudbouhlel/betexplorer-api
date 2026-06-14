import type { CacheEntry } from "../cache/cache-entry.js";
import { createCacheMetadata, isFresh } from "../cache/cache-entry.js";
import type { CachedResponse } from "../types/index.js";

export function cachedResponse<T>(
  entry: CacheEntry<T> | null,
  ttlSeconds: number,
  refreshing: boolean,
  fromCache: boolean,
  warnings: string[] = [],
): CachedResponse<T> | null {
  if (!entry) return null;
  return {
    data: entry.data,
    cache: createCacheMetadata(entry, ttlSeconds, refreshing, fromCache),
    warnings: entry.lastError ? [...warnings, entry.lastError] : warnings,
  };
}

export function shouldServeFresh<T>(entry: CacheEntry<T> | null, ttlSeconds: number, force: boolean): boolean {
  return !force && isFresh(entry, ttlSeconds);
}
