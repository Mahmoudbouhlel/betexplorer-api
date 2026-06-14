import { cacheTtl } from "../cache/cache-policy.js";
import { createCacheMetadata, recordCacheError, setCacheEntry } from "../cache/cache-entry.js";
import { matchDetailsCache } from "../cache/match-details.cache.js";
import { getKnownMatchUrl, matchUrlCache } from "../cache/match-list.cache.js";
import { parseMatchDetails } from "../parsers/match-details.parser.js";
import { validateEventId } from "../utils/url.js";
import { elapsedMs } from "../utils/timing.js";
import { errorMessage } from "../utils/result.js";
import { recordCacheHit, recordCacheMiss, recordMatchDetailsMetrics, recordParserMs } from "./performance.service.js";
import { activeDetails, dedupe } from "./request-deduplication.service.js";
import { fetchSourceHtml } from "./source.service.js";
export async function getMatchDetails(eventId, options = {}) {
    validateEventId(eventId);
    const entry = matchDetailsCache.get(eventId) ?? null;
    const force = options.force ?? false;
    const backgroundRefresh = options.backgroundRefresh ?? true;
    if (entry && !force) {
        const stale = Date.now() - entry.updatedAt > cacheTtl.details * 1000;
        if (stale && backgroundRefresh)
            void refreshMatchDetails(eventId, options.url).catch(() => undefined);
        recordCacheHit();
        recordMatchDetailsMetrics({
            lastEventId: eventId,
            cacheHit: true,
            statusResolved: entry.data.status !== "UNKNOWN",
            scoreResolved: entry.data.homeScore !== null && entry.data.awayScore !== null,
            oddsBookmakerCount: entry.data.bookmakerOdds?.length ?? 0,
            warnings: entry.lastError ? [entry.lastError] : [],
        });
        return {
            data: entry.data,
            cache: createCacheMetadata(entry, cacheTtl.details, stale && backgroundRefresh, true),
            warnings: entry.lastError ? [entry.lastError] : [],
        };
    }
    recordCacheMiss();
    try {
        const data = await refreshMatchDetails(eventId, options.url);
        return {
            data,
            cache: createCacheMetadata(matchDetailsCache.get(eventId) ?? null, cacheTtl.details, false, false),
            warnings: [],
        };
    }
    catch (error) {
        if (entry) {
            return {
                data: entry.data,
                cache: createCacheMetadata(entry, cacheTtl.details, false, true),
                warnings: [errorMessage(error)],
            };
        }
        throw error;
    }
}
export async function refreshMatchDetails(eventId, url) {
    validateEventId(eventId);
    const resolvedUrl = resolveMatchUrl(eventId, url);
    return dedupe(activeDetails, eventId, async () => {
        const navigationStarted = performance.now();
        const html = await fetchSourceHtml(resolvedUrl, {
            forceBrowser: true,
            blockImages: true,
            onPage: async (page) => {
                await waitForMatchDetailReady(page);
                await triggerRequiredLazySections(page);
                await waitForDetailSections(page);
                await normalizeLazyImageSources(page);
            },
        });
        const navigationDuration = elapsedMs(navigationStarted);
        const started = performance.now();
        const data = parseMatchDetails(html, resolvedUrl, eventId);
        const parseDuration = elapsedMs(started);
        recordParserMs("details", parseDuration);
        const validationStarted = performance.now();
        if (!data.homeTeam.name || !data.awayTeam.name)
            throw new Error("MATCH_DETAILS_PARSE_FAILED");
        if (data.status === "UNKNOWN" && data.homeScore === null && data.awayScore === null)
            throw new Error("MATCH_DETAILS_SOURCE_NOT_READY");
        const validationDuration = elapsedMs(validationStarted);
        setCacheEntry(matchDetailsCache, eventId, data);
        matchUrlCache.set(eventId, resolvedUrl);
        recordMatchDetailsMetrics({
            lastEventId: eventId,
            lastNavigationDurationMs: navigationDuration,
            lastParseDurationMs: parseDuration,
            lastValidationDurationMs: validationDuration,
            lastTotalDurationMs: navigationDuration + parseDuration + validationDuration,
            statusResolved: data.status !== "UNKNOWN",
            scoreResolved: data.homeScore !== null && data.awayScore !== null,
            oddsBookmakerCount: data.bookmakerOdds?.length ?? 0,
            cacheHit: false,
            warnings: [],
        });
        return data;
    }).catch((error) => {
        recordCacheError(matchDetailsCache, eventId, errorMessage(error));
        throw error;
    });
}
export function resolveMatchUrl(eventId, url) {
    validateEventId(eventId);
    const resolved = url ?? getKnownMatchUrl(eventId);
    if (!resolved)
        throw new Error("MATCH_URL_REQUIRED");
    return resolved;
}
export async function waitForMatchDetailReady(page) {
    try {
        await page.waitForFunction(() => {
            const hasRoot = Boolean(document.querySelector('script[type="application/ld+json"]') ||
                document.querySelector("#bestOddsComponent") ||
                document.querySelector("#H2HComponent") ||
                document.querySelector("#standingsComponent") ||
                document.querySelector("#mainContent"));
            const hasIdentity = Boolean(document.querySelector('link[rel="canonical"]') ||
                document.querySelector('script[type="application/ld+json"]')?.textContent?.includes("SportsEvent") ||
                document.body.textContent?.includes("data-event-id") ||
                document.querySelector("ul.list-details a[href*='/football/team/']") ||
                document.location.pathname.split("/").filter(Boolean).length >= 5);
            return hasRoot && hasIdentity;
        }, undefined, { timeout: 15_000, polling: 250 });
    }
    catch {
        throw new Error("MATCH_DETAILS_SOURCE_NOT_READY");
    }
}
async function triggerRequiredLazySections(page) {
    for (const selector of ["#H2HComponent", "#bestOddsComponent", "#standingsComponent"]) {
        await page.locator(selector).first().scrollIntoViewIfNeeded().catch(() => undefined);
        await page.waitForTimeout(150);
    }
}
async function waitForDetailSections(page) {
    await page
        .waitForFunction(() => Boolean(document.querySelector("#mainContent")) &&
        Boolean(document.querySelector("#bestOddsComponent") ||
            document.querySelector("#H2HComponent") ||
            document.querySelector("#standingsComponent")), undefined, { timeout: 10_000, polling: 250 })
        .catch(() => undefined);
}
async function normalizeLazyImageSources(page) {
    await page.evaluate(() => {
        const attributes = ["src", "data-src", "data-lazy-src", "data-original"];
        for (const image of Array.from(document.querySelectorAll("img"))) {
            for (const attribute of attributes) {
                const value = image.getAttribute(attribute);
                if (!value || value.startsWith("data:") || value.startsWith("javascript:") || value === "about:blank")
                    continue;
                image.setAttribute("src", value);
                break;
            }
        }
    });
}
//# sourceMappingURL=match-details.service.js.map