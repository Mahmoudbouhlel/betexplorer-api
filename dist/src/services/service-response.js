import { createCacheMetadata, isFresh } from "../cache/cache-entry.js";
export function cachedResponse(entry, ttlSeconds, refreshing, fromCache, warnings = []) {
    if (!entry)
        return null;
    return {
        data: entry.data,
        cache: createCacheMetadata(entry, ttlSeconds, refreshing, fromCache),
        warnings: entry.lastError ? [...warnings, entry.lastError] : warnings,
    };
}
export function shouldServeFresh(entry, ttlSeconds, force) {
    return !force && isFresh(entry, ttlSeconds);
}
//# sourceMappingURL=service-response.js.map