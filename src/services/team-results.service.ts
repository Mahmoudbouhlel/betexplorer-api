import { cacheTtl } from "../cache/cache-policy.js";
import { createCacheMetadata, recordCacheError, setCacheEntry } from "../cache/cache-entry.js";
import { teamPageResultsCache, teamResultsCache } from "../cache/team-results.cache.js";
import { applyTeamResultsView, parseRecentResults, parseTeamResultsSource, sourceToResults } from "../parsers/team-results.parser.js";
import { buildTeamReference, parseTeamReferenceFromUrl, validateEventId, validateTeamId } from "../utils/url.js";
import { elapsedMs } from "../utils/timing.js";
import { errorMessage } from "../utils/result.js";
import type { BetExplorerTeamReference, CachedResponse, MatchRecentResultsDto, TeamResultsDto } from "../types/index.js";
import {
  recordCacheHit,
  recordCacheMiss,
  recordMatchDetailsMetrics,
  recordParserMs,
  recordTeamResultsCacheHit,
  recordTeamResultsFetchMs,
  recordTeamResultsParseMs,
  recordTeamResultsRequest,
} from "./performance.service.js";
import { activeRecentResults, activeTeamResults, dedupe } from "./request-deduplication.service.js";
import { fetchSourceHtml } from "./source.service.js";
import { resolveMatchUrl, waitForMatchDetailReady } from "./match-details.service.js";

export interface TeamResultsRequestOptions {
  slug?: string;
  url?: string;
  tournamentId?: string | null;
  page?: number;
  limit?: number;
  formLimit?: number;
  force?: boolean;
  backgroundRefresh?: boolean;
}

export async function getRecentResults(
  eventId: string,
  options: { url?: string; force?: boolean; backgroundRefresh?: boolean; limit?: number } = {},
): Promise<CachedResponse<MatchRecentResultsDto>> {
  validateEventId(eventId);
  const entry = teamResultsCache.get(eventId) ?? null;
  const force = options.force ?? false;
  const backgroundRefresh = options.backgroundRefresh ?? true;
  if (entry && !force) {
    const stale = Date.now() - entry.updatedAt > cacheTtl.recentResults * 1000;
    if (stale && backgroundRefresh) void refreshRecentResults(eventId, options.url).catch(() => undefined);
    recordCacheHit();
    return { data: entry.data, cache: createCacheMetadata(entry, cacheTtl.recentResults, stale && backgroundRefresh, true), warnings: entry.lastError ? [entry.lastError] : [] };
  }
  recordCacheMiss();
  try {
    const data = await refreshRecentResults(eventId, options.url);
    return { data, cache: createCacheMetadata(teamResultsCache.get(eventId) ?? null, cacheTtl.recentResults, false, false), warnings: [] };
  } catch (error) {
    if (entry) return { data: entry.data, cache: createCacheMetadata(entry, cacheTtl.recentResults, false, true), warnings: [errorMessage(error)] };
    throw error;
  }
}

export async function refreshRecentResults(eventId: string, url?: string): Promise<MatchRecentResultsDto> {
  validateEventId(eventId);
  const resolvedUrl = resolveMatchUrl(eventId, url);
  return dedupe(activeRecentResults, eventId, async () => {
    const html = await fetchSourceHtml(resolvedUrl, {
      forceBrowser: true,
      blockImages: true,
      onPage: async (page) => {
        await waitForMatchDetailReady(page);
        await page.locator("#lastResultsComponent, #H2HComponent").first().scrollIntoViewIfNeeded().catch(() => undefined);
        await page.waitForTimeout(500);
      },
    });
    const started = performance.now();
    const data = parseRecentResults(html, eventId);
    recordParserMs("recentResults", elapsedMs(started));
    recordMatchDetailsMetrics({
      lastEventId: eventId,
      homeRecentCount: data.home.matches.length,
      awayRecentCount: data.away.matches.length,
    });
    setCacheEntry(teamResultsCache, eventId, data);
    return data;
  }).catch((error) => {
    recordCacheError(teamResultsCache, eventId, errorMessage(error));
    throw error;
  });
}

export async function getTeamResults(teamId: string, options: TeamResultsRequestOptions = {}): Promise<CachedResponse<TeamResultsDto>> {
  recordTeamResultsRequest();
  validateTeamId(teamId);
  const reference = resolveTeamReference(teamId, options);
  const key = teamResultsCacheKey(teamId);
  const entry = teamPageResultsCache.get(key) ?? null;
  const force = options.force ?? false;
  const backgroundRefresh = options.backgroundRefresh ?? true;

  if (entry && !force) {
    const stale = Date.now() - entry.updatedAt > cacheTtl.teamResults * 1000;
    if (stale && backgroundRefresh) void refreshTeamResults(teamId, options).catch(() => undefined);
    recordCacheHit();
    recordTeamResultsCacheHit();
    return {
      data: applyTeamResultsView(entry.data, options),
      cache: createCacheMetadata(entry, cacheTtl.teamResults, stale && backgroundRefresh, true),
      warnings: entry.lastError ? [entry.lastError] : [],
    };
  }

  recordCacheMiss();
  try {
    const data = await refreshTeamResults(teamId, { url: reference.resultsUrl });
    const cachedEntry = teamPageResultsCache.get(key) ?? null;
    return {
      data: applyTeamResultsView(data, options),
      cache: createCacheMetadata(cachedEntry, cacheTtl.teamResults, false, false),
      warnings: [],
    };
  } catch (error) {
    if (entry) {
      return {
        data: applyTeamResultsView(entry.data, options),
        cache: createCacheMetadata(entry, cacheTtl.teamResults, false, true),
        warnings: [errorMessage(error)],
      };
    }
    throw error;
  }
}

export async function refreshTeamResults(teamId: string, options: Pick<TeamResultsRequestOptions, "slug" | "url"> = {}): Promise<TeamResultsDto> {
  validateTeamId(teamId);
  const reference = resolveTeamReference(teamId, options);
  const key = teamResultsCacheKey(teamId);
  return dedupe(activeTeamResults, key, async () => {
    const fetchStarted = performance.now();
    const html = await fetchSourceHtml(reference.resultsUrl);
    recordTeamResultsFetchMs(elapsedMs(fetchStarted));
    const parseStarted = performance.now();
    const data = sourceToResults(parseTeamResultsSource(html, reference));
    const parseMs = elapsedMs(parseStarted);
    recordParserMs("teamResults", parseMs);
    recordTeamResultsParseMs(parseMs);
    setCacheEntry(teamPageResultsCache, key, data);
    return data;
  }).catch((error) => {
    recordCacheError(teamPageResultsCache, key, errorMessage(error));
    throw error;
  });
}

export function resolveTeamReference(teamId: string, options: Pick<TeamResultsRequestOptions, "slug" | "url">): BetExplorerTeamReference {
  const validTeamId = validateTeamId(teamId);
  if (options.url) {
    const reference = parseTeamReferenceFromUrl(options.url);
    if (reference.teamId !== validTeamId) throw new Error("INVALID_TEAM_URL");
    return reference;
  }
  if (!options.slug) throw new Error("TEAM_URL_REQUIRED");
  return buildTeamReference(options.slug, validTeamId);
}

export function teamResultsCacheKey(teamId: string): string {
  return `results:${validateTeamId(teamId)}`;
}
