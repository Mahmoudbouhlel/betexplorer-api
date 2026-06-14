import type { CacheEntry } from "../cache/cache-entry.js";
import type { CachedResponse } from "../types/index.js";
export declare function cachedResponse<T>(entry: CacheEntry<T> | null, ttlSeconds: number, refreshing: boolean, fromCache: boolean, warnings?: string[]): CachedResponse<T> | null;
export declare function shouldServeFresh<T>(entry: CacheEntry<T> | null, ttlSeconds: number, force: boolean): boolean;
//# sourceMappingURL=service-response.d.ts.map