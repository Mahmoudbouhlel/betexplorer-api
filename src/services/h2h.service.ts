import { cacheTtl } from "../cache/cache-policy.js";
import { createCacheMetadata, recordCacheError, setCacheEntry } from "../cache/cache-entry.js";
import { h2hCache } from "../cache/h2h.cache.js";
import { parseH2H } from "../parsers/h2h.parser.js";
import { validateEventId } from "../utils/url.js";
import { elapsedMs } from "../utils/timing.js";
import { errorMessage } from "../utils/result.js";
import type { CachedResponse, MatchH2HDto } from "../types/index.js";
import { recordCacheHit, recordCacheMiss, recordMatchDetailsMetrics, recordParserMs } from "./performance.service.js";
import { activeH2H, dedupe } from "./request-deduplication.service.js";
import { fetchSourceHtml } from "./source.service.js";
import { resolveMatchUrl, waitForMatchDetailReady } from "./match-details.service.js";

export async function getMatchH2H(eventId: string, options: { url?: string; force?: boolean; backgroundRefresh?: boolean } = {}): Promise<CachedResponse<MatchH2HDto>> {
  validateEventId(eventId);
  const entry = h2hCache.get(eventId) ?? null;
  const force = options.force ?? false;
  const backgroundRefresh = options.backgroundRefresh ?? true;
  if (entry && !force) {
    const stale = Date.now() - entry.updatedAt > cacheTtl.h2h * 1000;
    if (stale && backgroundRefresh) void refreshMatchH2H(eventId, options.url).catch(() => undefined);
    recordCacheHit();
    return { data: entry.data, cache: createCacheMetadata(entry, cacheTtl.h2h, stale && backgroundRefresh, true), warnings: entry.lastError ? [entry.lastError] : [] };
  }
  recordCacheMiss();
  try {
    const data = await refreshMatchH2H(eventId, options.url);
    return { data, cache: createCacheMetadata(h2hCache.get(eventId) ?? null, cacheTtl.h2h, false, false), warnings: [] };
  } catch (error) {
    if (entry) return { data: entry.data, cache: createCacheMetadata(entry, cacheTtl.h2h, false, true), warnings: [errorMessage(error)] };
    throw error;
  }
}

export async function refreshMatchH2H(eventId: string, url?: string): Promise<MatchH2HDto> {
  validateEventId(eventId);
  const resolvedUrl = resolveMatchUrl(eventId, url);
  return dedupe(activeH2H, eventId, async () => {
    const html = await fetchSourceHtml(resolvedUrl, {
      forceBrowser: true,
      blockImages: true,
      onPage: async (page) => {
        await waitForMatchDetailReady(page);
        await page.locator("#H2HComponent").first().scrollIntoViewIfNeeded().catch(() => undefined);
        await page.waitForTimeout(500);
      },
    });
    const started = performance.now();
    const data = parseH2H(html, eventId);
    recordParserMs("h2h", elapsedMs(started));
    recordMatchDetailsMetrics({
      lastEventId: eventId,
      h2hRowCount: data.matches.length,
    });
    setCacheEntry(h2hCache, eventId, data);
    return data;
  }).catch((error) => {
    recordCacheError(h2hCache, eventId, errorMessage(error));
    throw error;
  });
}
