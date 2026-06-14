export type BetExplorerMatchId = string;
export type MatchStatus = "SCHEDULED" | "LIVE" | "FINISHED" | "POSTPONED" | "CANCELLED" | "ABANDONED" | "UNKNOWN";
export interface ApiErrorResponse {
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
}
export interface CacheMetadata {
    fromCache: boolean;
    stale: boolean;
    refreshing: boolean;
    updatedAt: string | null;
    ageSeconds: number | null;
}
export interface CachedResponse<T> {
    data: T;
    cache: CacheMetadata;
    warnings: string[];
}
export type ParserName = "matchList" | "details" | "standings" | "h2h" | "recentResults" | "teamResults" | "teamFixtures" | "teamProfile";
//# sourceMappingURL=common.types.d.ts.map