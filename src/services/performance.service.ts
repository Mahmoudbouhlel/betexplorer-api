import type { ParserName } from "../types/index.js";

type Average = {
  count: number;
  totalMs: number;
};

const httpAverage: Average = { count: 0, totalMs: 0 };
const cacheStats = { hits: 0, misses: 0 };
const parserAverages: Record<ParserName, Average> = {
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

let matchListMetrics: MatchListMetrics = {
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

let matchDetailsMetrics: MatchDetailsMetrics = {
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

function average(item: Average): number {
  return item.count === 0 ? 0 : Math.round(item.totalMs / item.count);
}

export function recordHttpRequest(ms: number): void {
  httpAverage.count += 1;
  httpAverage.totalMs += ms;
}

export function recordParserMs(name: ParserName, ms: number): void {
  parserAverages[name].count += 1;
  parserAverages[name].totalMs += ms;
}

export function recordTeamResultsRequest(): void {
  teamResultsStats.requests += 1;
}

export function recordTeamResultsCacheHit(): void {
  teamResultsStats.cacheHits += 1;
}

export function recordTeamResultsFetchMs(ms: number): void {
  teamResultsStats.fetch.count += 1;
  teamResultsStats.fetch.totalMs += ms;
}

export function recordTeamResultsParseMs(ms: number): void {
  teamResultsStats.parse.count += 1;
  teamResultsStats.parse.totalMs += ms;
}

export function recordCacheHit(): void {
  cacheStats.hits += 1;
}

export function recordCacheMiss(): void {
  cacheStats.misses += 1;
}

export function recordBrowserLaunch(): void {
  browserLaunchCount += 1;
}

export function setBrowserPageStats(active: number, queued: number): void {
  activePages = active;
  queuedPages = queued;
}

export function recordMatchListMetrics(metrics: MatchListMetrics): void {
  matchListMetrics = metrics;
}

export function recordMatchDetailsMetrics(metrics: Partial<MatchDetailsMetrics> & { lastEventId: string }): void {
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
