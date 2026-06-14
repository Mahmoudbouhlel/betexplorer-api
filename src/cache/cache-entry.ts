import type { CacheMetadata } from "../types/index.js";

export interface CacheEntry<T> {
  data: T;
  updatedAt: number;
  lastError: string | null;
}

export function createCacheMetadata<T>(entry: CacheEntry<T> | null, ttlSeconds: number, refreshing: boolean, fromCache: boolean): CacheMetadata {
  if (!entry) {
    return {
      fromCache,
      stale: true,
      refreshing,
      updatedAt: null,
      ageSeconds: null,
    };
  }
  const ageSeconds = Math.max(0, Math.floor((Date.now() - entry.updatedAt) / 1000));
  return {
    fromCache,
    stale: ageSeconds > ttlSeconds,
    refreshing,
    updatedAt: new Date(entry.updatedAt).toISOString(),
    ageSeconds,
  };
}

export function isFresh<T>(entry: CacheEntry<T> | null, ttlSeconds: number): boolean {
  return Boolean(entry && Date.now() - entry.updatedAt <= ttlSeconds * 1000);
}

export function setCacheEntry<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): CacheEntry<T> {
  const entry = { data, updatedAt: Date.now(), lastError: null };
  cache.set(key, entry);
  return entry;
}

export function recordCacheError<T>(cache: Map<string, CacheEntry<T>>, key: string, message: string): void {
  const entry = cache.get(key);
  if (!entry) return;
  cache.set(key, { ...entry, lastError: message });
}
