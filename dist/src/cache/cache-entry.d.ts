import type { CacheMetadata } from "../types/index.js";
export interface CacheEntry<T> {
    data: T;
    updatedAt: number;
    lastError: string | null;
}
export declare function createCacheMetadata<T>(entry: CacheEntry<T> | null, ttlSeconds: number, refreshing: boolean, fromCache: boolean): CacheMetadata;
export declare function isFresh<T>(entry: CacheEntry<T> | null, ttlSeconds: number): boolean;
export declare function setCacheEntry<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): CacheEntry<T>;
export declare function recordCacheError<T>(cache: Map<string, CacheEntry<T>>, key: string, message: string): void;
//# sourceMappingURL=cache-entry.d.ts.map