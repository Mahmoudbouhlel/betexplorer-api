import { cacheTtl } from "../cache/cache-policy.js";
import { createCacheMetadata, recordCacheError, setCacheEntry } from "../cache/cache-entry.js";
import { standingsCache } from "../cache/standings.cache.js";
import { findStandingsAjaxUrl, parseStandings } from "../parsers/standings.parser.js";
import { validateEventId } from "../utils/url.js";
import { elapsedMs } from "../utils/timing.js";
import { errorMessage } from "../utils/result.js";
import { recordCacheHit, recordCacheMiss, recordMatchDetailsMetrics, recordParserMs } from "./performance.service.js";
import { activeStandings, dedupe } from "./request-deduplication.service.js";
import { fetchSourceHtml } from "./source.service.js";
import { getMatchDetails, resolveMatchUrl, waitForMatchDetailReady } from "./match-details.service.js";
export async function getMatchStandings(eventId, options = {}) {
    validateEventId(eventId);
    const entry = standingsCache.get(eventId) ?? null;
    const force = options.force ?? false;
    const backgroundRefresh = options.backgroundRefresh ?? true;
    if (entry && !force) {
        const stale = Date.now() - entry.updatedAt > cacheTtl.standings * 1000;
        if (stale && backgroundRefresh)
            void refreshMatchStandings(eventId, options.url).catch(() => undefined);
        recordCacheHit();
        return { data: entry.data, cache: createCacheMetadata(entry, cacheTtl.standings, stale && backgroundRefresh, true), warnings: entry.lastError ? [entry.lastError] : [] };
    }
    recordCacheMiss();
    try {
        const data = await refreshMatchStandings(eventId, options.url);
        return { data, cache: createCacheMetadata(standingsCache.get(eventId) ?? null, cacheTtl.standings, false, false), warnings: [] };
    }
    catch (error) {
        if (entry)
            return { data: entry.data, cache: createCacheMetadata(entry, cacheTtl.standings, false, true), warnings: [errorMessage(error)] };
        throw error;
    }
}
export async function refreshMatchStandings(eventId, url) {
    validateEventId(eventId);
    const resolvedUrl = resolveMatchUrl(eventId, url);
    return dedupe(activeStandings, eventId, async () => {
        const [matchPageHtml, details] = await Promise.all([
            fetchSourceHtml(resolvedUrl, {
                forceBrowser: true,
                blockImages: true,
                onPage: async (page) => {
                    await waitForMatchDetailReady(page);
                    await page.locator("#standingsComponent").first().scrollIntoViewIfNeeded().catch(() => undefined);
                    await page.waitForTimeout(500);
                },
            }),
            getMatchDetails(eventId, { url: resolvedUrl, backgroundRefresh: false }).then((response) => response.data).catch(() => null),
        ]);
        const started = performance.now();
        let data = parseStandings(matchPageHtml, eventId, details);
        if (data.groups.length === 0) {
            const ajaxUrl = findStandingsAjaxUrl(matchPageHtml);
            if (!ajaxUrl)
                throw new Error("STANDINGS_LINK_NOT_FOUND");
            data = parseStandings(await fetchSourceHtml(ajaxUrl), eventId, details);
        }
        recordParserMs("standings", elapsedMs(started));
        if (data.groups.length === 0)
            throw new Error("STANDINGS_PARSE_FAILED");
        recordMatchDetailsMetrics({
            lastEventId: eventId,
            standingsRowCount: data.groups.reduce((total, group) => total + group.rows.length, 0),
        });
        setCacheEntry(standingsCache, eventId, data);
        return data;
    }).catch((error) => {
        recordCacheError(standingsCache, eventId, errorMessage(error));
        throw error;
    });
}
//# sourceMappingURL=standings.service.js.map