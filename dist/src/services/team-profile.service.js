import * as cheerio from "cheerio";
import { cacheTtl } from "../cache/cache-policy.js";
import { createCacheMetadata, recordCacheError, setCacheEntry } from "../cache/cache-entry.js";
import { matchTeamsCache, teamProfileCache } from "../cache/team-profile.cache.js";
import { parseMatchDetails } from "../parsers/match-details.parser.js";
import { errorMessage } from "../utils/result.js";
import { cleanText, normalizeTeamName } from "../utils/text.js";
import { parseTeamReferenceFromUrl, validateEventId, validateTeamId, } from "../utils/url.js";
import { activeMatchTeams, activeTeamProfiles, dedupe } from "./request-deduplication.service.js";
import { fetchSourceHtml } from "./source.service.js";
import { resolveMatchUrl } from "./match-details.service.js";
import { getTeamFixtures } from "./team-fixtures.service.js";
import { getTeamResults, resolveTeamReference } from "./team-results.service.js";
export async function getTeamProfile(teamId, options = {}) {
    validateTeamId(teamId);
    const reference = resolveTeamReference(teamId, options);
    const key = teamProfileCacheKey(teamId);
    const entry = teamProfileCache.get(key) ?? null;
    const force = options.force ?? false;
    const backgroundRefresh = options.backgroundRefresh ?? true;
    if (entry && !force) {
        const stale = Date.now() - entry.updatedAt > cacheTtl.teamProfile * 1000;
        if (stale && backgroundRefresh)
            void refreshTeamProfile(teamId, options).catch(() => undefined);
        return {
            data: entry.data,
            cache: createCacheMetadata(entry, cacheTtl.teamProfile, stale && backgroundRefresh, true),
            warnings: entry.lastError ? [entry.lastError] : entry.data.warnings,
        };
    }
    try {
        const data = await refreshTeamProfile(teamId, { ...options, url: reference.baseUrl });
        return {
            data,
            cache: createCacheMetadata(teamProfileCache.get(key) ?? null, cacheTtl.teamProfile, false, false),
            warnings: data.warnings,
        };
    }
    catch (error) {
        if (entry) {
            return {
                data: entry.data,
                cache: createCacheMetadata(entry, cacheTtl.teamProfile, false, true),
                warnings: [errorMessage(error)],
            };
        }
        throw error;
    }
}
export async function refreshTeamProfile(teamId, options = {}) {
    validateTeamId(teamId);
    const reference = resolveTeamReference(teamId, options);
    const key = teamProfileCacheKey(teamId);
    return dedupe(activeTeamProfiles, key, async () => {
        const includeResults = options.includeResults ?? true;
        const includeFixtures = options.includeFixtures ?? true;
        const resultsOptions = teamSectionOptions(reference, options, options.resultsLimit ?? options.limit ?? 20);
        const fixturesOptions = teamSectionOptions(reference, options, options.fixturesLimit ?? options.limit ?? 20);
        const [results, fixtures] = await Promise.allSettled([
            includeResults ? getTeamResults(teamId, { ...resultsOptions, url: reference.resultsUrl }) : Promise.resolve(null),
            includeFixtures ? getTeamFixtures(teamId, { ...fixturesOptions, url: reference.fixturesUrl }) : Promise.resolve(null),
        ]);
        const warnings = [results, fixtures].flatMap((result) => (result.status === "rejected" ? [errorMessage(result.reason)] : []));
        const fulfilledResults = results.status === "fulfilled" ? results.value : null;
        const fulfilledFixtures = fixtures.status === "fulfilled" ? fixtures.value : null;
        const data = {
            team: fulfilledResults?.data.team ?? fulfilledFixtures?.data.team ?? fallbackTeamIdentity(reference),
            results: fulfilledResults?.data ?? null,
            fixtures: fulfilledFixtures?.data ?? null,
            warnings: [
                ...warnings,
                ...(fulfilledResults?.warnings ?? []),
                ...(fulfilledFixtures?.warnings ?? []),
            ],
        };
        setCacheEntry(teamProfileCache, key, data);
        return data;
    }).catch((error) => {
        recordCacheError(teamProfileCache, key, errorMessage(error));
        throw error;
    });
}
export async function getMatchTeams(eventId, options = {}) {
    validateEventId(eventId);
    const key = matchTeamsCacheKey(eventId);
    const entry = matchTeamsCache.get(key) ?? null;
    const force = options.force ?? false;
    const backgroundRefresh = options.backgroundRefresh ?? true;
    if (entry && !force) {
        const stale = Date.now() - entry.updatedAt > cacheTtl.teamProfile * 1000;
        if (stale && backgroundRefresh)
            void refreshMatchTeams(eventId, options.url).catch(() => undefined);
        return {
            data: entry.data,
            cache: createCacheMetadata(entry, cacheTtl.teamProfile, stale && backgroundRefresh, true),
            warnings: entry.lastError ? [entry.lastError] : [],
        };
    }
    try {
        const data = await refreshMatchTeams(eventId, options.url);
        return {
            data,
            cache: createCacheMetadata(matchTeamsCache.get(key) ?? null, cacheTtl.teamProfile, false, false),
            warnings: [],
        };
    }
    catch (error) {
        if (entry) {
            return {
                data: entry.data,
                cache: createCacheMetadata(entry, cacheTtl.teamProfile, false, true),
                warnings: [errorMessage(error)],
            };
        }
        throw error;
    }
}
export async function refreshMatchTeams(eventId, url) {
    validateEventId(eventId);
    const resolvedUrl = resolveMatchUrl(eventId, url);
    const key = matchTeamsCacheKey(eventId);
    return dedupe(activeMatchTeams, key, async () => {
        const html = await fetchSourceHtml(resolvedUrl);
        const data = parseMatchTeamsFromHtml(html, eventId, resolvedUrl);
        setCacheEntry(matchTeamsCache, key, data);
        return data;
    }).catch((error) => {
        recordCacheError(matchTeamsCache, key, errorMessage(error));
        throw error;
    });
}
export function parseMatchTeamsFromHtml(html, eventId, matchUrl) {
    validateEventId(eventId);
    const $ = cheerio.load(html);
    const details = parseMatchDetails(html, matchUrl, eventId);
    const candidates = uniqueTeamReferences($);
    const home = findTeamReference(candidates, details.homeTeam.name) ?? candidates[0] ?? null;
    const away = findTeamReference(candidates.filter((candidate) => candidate.teamId !== home?.teamId), details.awayTeam.name) ??
        candidates.find((candidate) => candidate.teamId !== home?.teamId) ??
        null;
    return {
        eventId,
        home,
        away,
        scrapedAt: new Date().toISOString(),
    };
}
function uniqueTeamReferences($) {
    const seen = new Set();
    const references = [];
    $('a[href*="/football/team/"]').each((_index, element) => {
        const href = $(element).attr("href");
        if (!href)
            return;
        let reference;
        try {
            reference = parseTeamReferenceFromUrl(new URL(href, "https://www.betexplorer.com").toString());
        }
        catch {
            return;
        }
        if (seen.has(reference.teamId))
            return;
        seen.add(reference.teamId);
        references.push({
            name: cleanText($(element).text()) || titleCaseSlug(reference.slug),
            teamId: reference.teamId,
            slug: reference.slug,
            summaryUrl: reference.baseUrl,
            resultsUrl: reference.resultsUrl,
            fixturesUrl: reference.fixturesUrl,
        });
    });
    return references;
}
function findTeamReference(candidates, name) {
    const normalized = normalizeTeamName(name);
    if (!normalized)
        return null;
    return candidates.find((candidate) => normalizeTeamName(candidate.name) === normalized) ?? null;
}
function teamSectionOptions(reference, options, limit) {
    const sectionOptions = {
        slug: reference.slug,
        page: 1,
        limit,
    };
    if (options.backgroundRefresh !== undefined)
        sectionOptions.backgroundRefresh = options.backgroundRefresh;
    if (options.force !== undefined)
        sectionOptions.force = options.force;
    return sectionOptions;
}
function fallbackTeamIdentity(reference) {
    return {
        teamId: reference.teamId,
        slug: reference.slug,
        name: titleCaseSlug(reference.slug),
        summaryUrl: reference.baseUrl,
        resultsUrl: reference.resultsUrl,
        fixturesUrl: reference.fixturesUrl,
        logo: null,
    };
}
function titleCaseSlug(slug) {
    return slug
        .split("-")
        .filter(Boolean)
        .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
        .join(" ");
}
function teamProfileCacheKey(teamId) {
    return `profile:${validateTeamId(teamId)}`;
}
function matchTeamsCacheKey(eventId) {
    return `match-teams:${validateEventId(eventId)}`;
}
//# sourceMappingURL=team-profile.service.js.map