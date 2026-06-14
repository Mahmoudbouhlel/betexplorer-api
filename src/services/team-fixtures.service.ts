import { cacheTtl } from "../cache/cache-policy.js";
import { createCacheMetadata, recordCacheError, setCacheEntry } from "../cache/cache-entry.js";
import { teamFixturesCache } from "../cache/team-fixtures.cache.js";
import { applyTeamFixturesPageView, parseTeamFixturesSource, sourceToFixtures } from "../parsers/team-fixtures.parser.js";
import type { CachedResponse, TeamFixturesDto } from "../types/index.js";
import { elapsedMs } from "../utils/timing.js";
import { errorMessage } from "../utils/result.js";
import { validateTeamId } from "../utils/url.js";
import { recordCacheHit, recordCacheMiss, recordParserMs } from "./performance.service.js";
import { activeTeamFixtures, dedupe } from "./request-deduplication.service.js";
import { fetchSourceHtml } from "./source.service.js";
import { resolveTeamReference, type TeamResultsRequestOptions } from "./team-results.service.js";

export interface TeamFixturesRequestOptions extends TeamResultsRequestOptions {
  tournamentId?: string | null;
}

export async function getTeamFixtures(teamId: string, options: TeamFixturesRequestOptions = {}): Promise<CachedResponse<TeamFixturesDto>> {
  validateTeamId(teamId);
  const reference = resolveTeamReference(teamId, options);
  const key = teamFixturesCacheKey(teamId);
  const entry = teamFixturesCache.get(key) ?? null;
  const force = options.force ?? false;
  const backgroundRefresh = options.backgroundRefresh ?? true;

  if (entry && !force) {
    const stale = Date.now() - entry.updatedAt > cacheTtl.teamFixtures * 1000;
    if (stale && backgroundRefresh) void refreshTeamFixtures(teamId, options).catch(() => undefined);
    recordCacheHit();
    return {
      data: applyTeamFixturesPageView(entry.data, options),
      cache: createCacheMetadata(entry, cacheTtl.teamFixtures, stale && backgroundRefresh, true),
      warnings: entry.lastError ? [entry.lastError] : [],
    };
  }

  recordCacheMiss();
  try {
    const data = await refreshTeamFixtures(teamId, { url: reference.fixturesUrl });
    const cachedEntry = teamFixturesCache.get(key) ?? null;
    return {
      data: applyTeamFixturesPageView(data, options),
      cache: createCacheMetadata(cachedEntry, cacheTtl.teamFixtures, false, false),
      warnings: [],
    };
  } catch (error) {
    if (entry) {
      return {
        data: applyTeamFixturesPageView(entry.data, options),
        cache: createCacheMetadata(entry, cacheTtl.teamFixtures, false, true),
        warnings: [errorMessage(error)],
      };
    }
    throw error;
  }
}

export async function refreshTeamFixtures(teamId: string, options: Pick<TeamFixturesRequestOptions, "slug" | "url"> = {}): Promise<TeamFixturesDto> {
  validateTeamId(teamId);
  const reference = resolveTeamReference(teamId, options);
  const key = teamFixturesCacheKey(teamId);
  return dedupe(activeTeamFixtures, key, async () => {
    const html = await fetchSourceHtml(reference.fixturesUrl);
    const started = performance.now();
    const data = sourceToFixtures(parseTeamFixturesSource(html, reference));
    recordParserMs("teamFixtures", elapsedMs(started));
    setCacheEntry(teamFixturesCache, key, data);
    return data;
  }).catch((error) => {
    recordCacheError(teamFixturesCache, key, errorMessage(error));
    throw error;
  });
}

export function teamFixturesCacheKey(teamId: string): string {
  return `fixtures:${validateTeamId(teamId)}`;
}
