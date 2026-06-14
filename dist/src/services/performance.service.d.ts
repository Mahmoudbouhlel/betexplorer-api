import type { ParserName } from "../types/index.js";
type MatchListMetrics = {
    lastInitialCount: number;
    lastFinalCount: number;
    lastScrollIterations: number;
    lastSuccessfulLoads: number;
    lastStagnantIterations: number;
    lastScrollDurationMs: number;
    lastParseDurationMs: number;
    lastValidationDurationMs: number;
    lastTotalDurationMs: number;
    matchesWithHomeLogo: number;
    matchesWithAwayLogo: number;
    matchesWithAnyOdds: number;
    matchesWithCompleteOdds: number;
    finishedMatches: number;
    finishedMatchesWithoutScore: number;
    lastStopReason: string | null;
};
type MatchDetailsMetrics = {
    lastEventId: string | null;
    lastNavigationDurationMs: number;
    lastParseDurationMs: number;
    lastValidationDurationMs: number;
    lastTotalDurationMs: number;
    statusResolved: boolean;
    scoreResolved: boolean;
    oddsBookmakerCount: number;
    standingsRowCount: number;
    h2hRowCount: number;
    homeRecentCount: number;
    awayRecentCount: number;
    cacheHit: boolean;
    warnings: string[];
};
export declare function recordHttpRequest(ms: number): void;
export declare function recordParserMs(name: ParserName, ms: number): void;
export declare function recordTeamResultsRequest(): void;
export declare function recordTeamResultsCacheHit(): void;
export declare function recordTeamResultsFetchMs(ms: number): void;
export declare function recordTeamResultsParseMs(ms: number): void;
export declare function recordCacheHit(): void;
export declare function recordCacheMiss(): void;
export declare function recordBrowserLaunch(): void;
export declare function setBrowserPageStats(active: number, queued: number): void;
export declare function recordMatchListMetrics(metrics: MatchListMetrics): void;
export declare function recordMatchDetailsMetrics(metrics: Partial<MatchDetailsMetrics> & {
    lastEventId: string;
}): void;
export declare function getPerformanceMetrics(): {
    http: {
        requests: number;
        averageMs: number;
    };
    browser: {
        launchCount: number;
        connected: boolean;
        activePages: number;
        queuedPages: number;
        queuedPageRequests: number;
    };
    cache: {
        hitRate: number;
    };
    parsers: {
        matchListAverageMs: number;
        detailsAverageMs: number;
        standingsAverageMs: number;
        h2hAverageMs: number;
        recentResultsAverageMs: number;
        teamResultsAverageMs: number;
        teamFixturesAverageMs: number;
        teamProfileAverageMs: number;
    };
    teamResults: {
        requests: number;
        cacheHits: number;
        cacheHitRate: number;
        averageFetchMs: number;
        averageParseMs: number;
    };
    matchList: MatchListMetrics;
    matchDetails: MatchDetailsMetrics;
};
export {};
//# sourceMappingURL=performance.service.d.ts.map