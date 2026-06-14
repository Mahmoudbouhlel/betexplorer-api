import { createCacheMetadata, setCacheEntry } from "../cache/cache-entry.js";
import { cacheTtl, fullMatchTtlSeconds } from "../cache/cache-policy.js";
import { fullMatchCache, type FullMatchDto } from "../cache/full-match.cache.js";
import { validateEventId } from "../utils/url.js";
import { errorMessage } from "../utils/result.js";
import type { CachedResponse, TeamReferenceDto, TeamResultsDto } from "../types/index.js";
import { activeFullMatches, dedupe } from "./request-deduplication.service.js";
import { refreshMatchDetails } from "./match-details.service.js";
import { refreshMatchH2H } from "./h2h.service.js";
import { getTeamResults, refreshRecentResults } from "./team-results.service.js";
import { refreshMatchStandings } from "./standings.service.js";
import { refreshMatchTeams } from "./team-profile.service.js";

interface FullTeamResultsPayload {
  data: {
    home: TeamResultsDto | null;
    away: TeamResultsDto | null;
  };
  warnings: string[];
}

export async function getFullMatch(
  eventId: string,
  options: {
    url?: string;
    backgroundRefresh?: boolean;
    includeDetails?: boolean;
    includeStandings?: boolean;
    includeH2H?: boolean;
    includeRecentResults?: boolean;
    includeTeamResults?: boolean;
    teamResultsLimit?: number;
    force?: boolean;
  } = {},
): Promise<CachedResponse<FullMatchDto>> {
  validateEventId(eventId);
  const entry = fullMatchCache.get(eventId) ?? null;
  const backgroundRefresh = options.backgroundRefresh ?? true;
  const force = options.force ?? false;
  const needsMissingTeamResults = (options.includeTeamResults ?? false) && !entry?.data.teamResults;
  if (entry && !force && !needsMissingTeamResults) {
    const stale = Date.now() - entry.updatedAt > fullMatchTtlSeconds() * 1000;
    if (stale && backgroundRefresh) void refreshFullMatch(eventId, options.url, options).catch(() => undefined);
    return { data: entry.data, cache: createCacheMetadata(entry, fullMatchTtlSeconds(), stale && backgroundRefresh, true), warnings: entry.lastError ? [entry.lastError] : [] };
  }
  const data = await refreshFullMatch(eventId, options.url, options);
  return { data, cache: createCacheMetadata(fullMatchCache.get(eventId) ?? null, fullMatchTtlSeconds(), false, false), warnings: data.warnings };
}

export async function refreshFullMatch(
  eventId: string,
  url?: string,
  options: {
    includeDetails?: boolean;
    includeStandings?: boolean;
    includeH2H?: boolean;
    includeRecentResults?: boolean;
    includeTeamResults?: boolean;
    teamResultsLimit?: number;
  } = {},
): Promise<FullMatchDto> {
  validateEventId(eventId);
  return dedupe(activeFullMatches, eventId, async () => {
    const includeDetails = options.includeDetails ?? true;
    const includeStandings = options.includeStandings ?? true;
    const includeH2H = options.includeH2H ?? true;
    const includeRecentResults = options.includeRecentResults ?? true;
    const includeTeamResults = options.includeTeamResults ?? false;
    const tasks = {
      details: includeDetails ? refreshMatchDetails(eventId, url) : Promise.resolve(null),
      standings: includeStandings ? refreshMatchStandings(eventId, url) : Promise.resolve(null),
      h2h: includeH2H ? refreshMatchH2H(eventId, url) : Promise.resolve(null),
      recentResults: includeRecentResults ? refreshRecentResults(eventId, url) : Promise.resolve(null),
      teamResults: includeTeamResults ? getFullTeamResults(eventId, url, options.teamResultsLimit ?? 10) : Promise.resolve(null),
    };
    const [details, standings, h2h, recentResults, teamResults] = await Promise.allSettled([
      tasks.details,
      tasks.standings,
      tasks.h2h,
      tasks.recentResults,
      tasks.teamResults,
    ]);
    const rejectedWarnings = [details, standings, h2h, recentResults, teamResults].flatMap((result) => (result.status === "rejected" ? [errorMessage(result.reason)] : []));
    const teamResultWarnings = teamResults.status === "fulfilled" && teamResults.value ? teamResults.value.warnings : [];
    const full: FullMatchDto = {
      eventId,
      details: details.status === "fulfilled" ? details.value : null,
      standings: standings.status === "fulfilled" ? standings.value : null,
      h2h: h2h.status === "fulfilled" ? h2h.value : null,
      recentResults: recentResults.status === "fulfilled" ? recentResults.value : null,
      teamResults: teamResults.status === "fulfilled" && teamResults.value ? teamResults.value.data : null,
      cache: {
        details: createCacheMetadata(null, cacheTtl.details, false, false),
        standings: createCacheMetadata(null, cacheTtl.standings, false, false),
        h2h: createCacheMetadata(null, cacheTtl.h2h, false, false),
        recentResults: createCacheMetadata(null, cacheTtl.recentResults, false, false),
        teamResults: createCacheMetadata(null, cacheTtl.teamResults, false, false),
      },
      warnings: [...rejectedWarnings, ...teamResultWarnings],
    };
    setCacheEntry(fullMatchCache, eventId, full);
    return full;
  });
}

async function getFullTeamResults(eventId: string, url: string | undefined, limit: number): Promise<FullTeamResultsPayload> {
  const teams = await refreshMatchTeams(eventId, url);
  const [home, away] = await Promise.allSettled([
    teams.home ? getTeamResultsForReference(teams.home, limit) : Promise.resolve(null),
    teams.away ? getTeamResultsForReference(teams.away, limit) : Promise.resolve(null),
  ]);
  return {
    data: {
      home: home.status === "fulfilled" ? home.value : null,
      away: away.status === "fulfilled" ? away.value : null,
    },
    warnings: [home, away].flatMap((result) => (result.status === "rejected" ? [errorMessage(result.reason)] : [])),
  };
}

async function getTeamResultsForReference(reference: TeamReferenceDto, limit: number): Promise<TeamResultsDto> {
  const response = await getTeamResults(reference.teamId, {
    url: reference.resultsUrl,
    page: 1,
    limit,
    formLimit: 10,
    backgroundRefresh: false,
  });
  return response.data;
}
