export function createCacheMetadata(entry, ttlSeconds, refreshing, fromCache) {
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
export function isFresh(entry, ttlSeconds) {
    return Boolean(entry && Date.now() - entry.updatedAt <= ttlSeconds * 1000);
}
export function setCacheEntry(cache, key, data) {
    const entry = { data, updatedAt: Date.now(), lastError: null };
    cache.set(key, entry);
    return entry;
}
export function recordCacheError(cache, key, message) {
    const entry = cache.get(key);
    if (!entry)
        return;
    cache.set(key, { ...entry, lastError: message });
}
//# sourceMappingURL=cache-entry.js.map