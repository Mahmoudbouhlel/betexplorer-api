const httpAverage = { count: 0, totalMs: 0 };
const cacheStats = { hits: 0, misses: 0 };
const parserAverages = {
    matchList: { count: 0, totalMs: 0 },
    details: { count: 0, totalMs: 0 },
    standings: { count: 0, totalMs: 0 },
    h2h: { count: 0, totalMs: 0 },
    recentResults: { count: 0, totalMs: 0 },
    teamResults: { count: 0, totalMs: 0 },
    teamFixtures: { count: 0, totalMs: 0 },
    teamProfile: { count: 0, totalMs: 0 },
};
const teamResultsStats = {
    requests: 0,
    cacheHits: 0,
    fetch: { count: 0, totalMs: 0 },
    parse: { count: 0, totalMs: 0 },
};
let matchListMetrics = {
    lastInitialCount: 0,
    lastFinalCount: 0,
    lastScrollIterations: 0,
    lastSuccessfulLoads: 0,
    lastStagnantIterations: 0,
    lastScrollDurationMs: 0,
    lastParseDurationMs: 0,
    lastValidationDurationMs: 0,
    lastTotalDurationMs: 0,
    matchesWithHomeLogo: 0,
    matchesWithAwayLogo: 0,
    matchesWithAnyOdds: 0,
    matchesWithCompleteOdds: 0,
    finishedMatches: 0,
    finishedMatchesWithoutScore: 0,
    lastStopReason: null,
};
let matchDetailsMetrics = {
    lastEventId: null,
    lastNavigationDurationMs: 0,
    lastParseDurationMs: 0,
    lastValidationDurationMs: 0,
    lastTotalDurationMs: 0,
    statusResolved: false,
    scoreResolved: false,
    oddsBookmakerCount: 0,
    standingsRowCount: 0,
    h2hRowCount: 0,
    homeRecentCount: 0,
    awayRecentCount: 0,
    cacheHit: false,
    warnings: [],
};
let browserLaunchCount = 0;
let activePages = 0;
let queuedPages = 0;
function average(item) {
    return item.count === 0 ? 0 : Math.round(item.totalMs / item.count);
}
export function recordHttpRequest(ms) {
    httpAverage.count += 1;
    httpAverage.totalMs += ms;
}
export function recordParserMs(name, ms) {
    parserAverages[name].count += 1;
    parserAverages[name].totalMs += ms;
}
export function recordTeamResultsRequest() {
    teamResultsStats.requests += 1;
}
export function recordTeamResultsCacheHit() {
    teamResultsStats.cacheHits += 1;
}
export function recordTeamResultsFetchMs(ms) {
    teamResultsStats.fetch.count += 1;
    teamResultsStats.fetch.totalMs += ms;
}
export function recordTeamResultsParseMs(ms) {
    teamResultsStats.parse.count += 1;
    teamResultsStats.parse.totalMs += ms;
}
export function recordCacheHit() {
    cacheStats.hits += 1;
}
export function recordCacheMiss() {
    cacheStats.misses += 1;
}
export function recordBrowserLaunch() {
    browserLaunchCount += 1;
}
export function setBrowserPageStats(active, queued) {
    activePages = active;
    queuedPages = queued;
}
export function recordMatchListMetrics(metrics) {
    matchListMetrics = metrics;
}
export function recordMatchDetailsMetrics(metrics) {
    matchDetailsMetrics = {
        ...matchDetailsMetrics,
        ...metrics,
    };
}
export function getPerformanceMetrics() {
    const cacheTotal = cacheStats.hits + cacheStats.misses;
    return {
        http: {
            requests: httpAverage.count,
            averageMs: average(httpAverage),
        },
        browser: {
            launchCount: browserLaunchCount,
            connected: activePages > 0 || browserLaunchCount > 0,
            activePages,
            queuedPages,
            queuedPageRequests: queuedPages,
        },
        cache: {
            hitRate: cacheTotal === 0 ? 0 : cacheStats.hits / cacheTotal,
        },
        parsers: {
            matchListAverageMs: average(parserAverages.matchList),
            detailsAverageMs: average(parserAverages.details),
            standingsAverageMs: average(parserAverages.standings),
            h2hAverageMs: average(parserAverages.h2h),
            recentResultsAverageMs: average(parserAverages.recentResults),
            teamResultsAverageMs: average(parserAverages.teamResults),
            teamFixturesAverageMs: average(parserAverages.teamFixtures),
            teamProfileAverageMs: average(parserAverages.teamProfile),
        },
        teamResults: {
            requests: teamResultsStats.requests,
            cacheHits: teamResultsStats.cacheHits,
            cacheHitRate: teamResultsStats.requests === 0 ? 0 : teamResultsStats.cacheHits / teamResultsStats.requests,
            averageFetchMs: average(teamResultsStats.fetch),
            averageParseMs: average(teamResultsStats.parse),
        },
        matchList: matchListMetrics,
        matchDetails: matchDetailsMetrics,
    };
}
//# sourceMappingURL=performance.service.js.map