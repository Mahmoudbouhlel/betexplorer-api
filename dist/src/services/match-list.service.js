import { createCacheMetadata, recordCacheError, setCacheEntry, } from "../cache/cache-entry.js";
import { indexMatchList, matchListCache, } from "../cache/match-list.cache.js";
import { cacheTtl, } from "../cache/cache-policy.js";
import { env, } from "../config/env.js";
import { parseMatchList, } from "../parsers/match-list.parser.js";
import { errorMessage, } from "../utils/result.js";
import { elapsedMs, } from "../utils/timing.js";
import { loadAllMatches, } from "./load-all-matches.service.js";
import { recordCacheHit, recordCacheMiss, recordMatchListMetrics, recordParserMs, } from "./performance.service.js";
import { activeMatchLists, dedupe, } from "./request-deduplication.service.js";
import { fetchSourceHtml, } from "./source.service.js";
const HOMEPAGE_SCOPE = "homepage";
/**
 * Configuration du chargement dynamique de la liste.
 *
 * Le chargement s'arrête après plusieurs passes successives
 * sans nouveau match.
 */
const MATCH_LIST_LOADING_OPTIONS = {
    maxIterations: env.MATCH_LIST_SCROLL_MAX_ITERATIONS,
    maxIdlePasses: env.MATCH_LIST_SCROLL_MAX_STAGNANT_ITERATIONS,
    waitAfterActionMs: env.MATCH_LIST_SCROLL_WAIT_TIMEOUT_MS,
    initialTimeoutMs: 30_000,
};
export async function getMatchList(options = {}) {
    const force = options.force ?? false;
    const backgroundRefresh = options.backgroundRefresh ?? false;
    const entry = matchListCache.get(HOMEPAGE_SCOPE) ?? null;
    /*
     * Retourner immédiatement le cache lorsque force=false.
     */
    if (entry && !force) {
        const ageMilliseconds = Date.now() -
            entry.updatedAt;
        const stale = ageMilliseconds >
            cacheTtl.matchList * 1_000;
        /*
         * Retourner le cache puis lancer le refresh en arrière-plan.
         */
        if (stale &&
            backgroundRefresh) {
            void refreshMatchList().catch((error) => {
                console.error("[matches] Background refresh failed:", errorMessage(error));
            });
        }
        recordCacheHit();
        return {
            data: entry.data,
            cache: createCacheMetadata(entry, cacheTtl.matchList, stale &&
                backgroundRefresh, true),
            warnings: entry.lastError
                ? [entry.lastError]
                : [],
        };
    }
    recordCacheMiss();
    try {
        const data = await refreshMatchList();
        return {
            data,
            cache: createCacheMetadata(matchListCache.get(HOMEPAGE_SCOPE) ?? null, cacheTtl.matchList, false, false),
            warnings: [],
        };
    }
    catch (error) {
        /*
         * En cas d'erreur de scraping, utiliser l'ancien cache
         * si un résultat précédent est disponible.
         */
        if (entry) {
            const message = errorMessage(error);
            console.warn("[matches] Refresh failed, returning previous cache:", message);
            return {
                data: entry.data,
                cache: createCacheMetadata(entry, cacheTtl.matchList, false, true),
                warnings: [
                    message,
                ],
            };
        }
        throw error;
    }
}
export async function refreshMatchList() {
    return dedupe(activeMatchLists, HOMEPAGE_SCOPE, async () => {
        console.log("[matches] Refresh started");
        console.log(`[matches] Source URL: ${env.BETEXPLORER_BASE_URL}`);
        let browserMatchCount = 0;
        let browserRawRowCount = 0;
        let scrollIterations = 0;
        let successfulLoads = 0;
        let stagnantIterations = 0;
        let scrollDurationMs = 0;
        let scrollStopReason = "NO_NEW_MATCHES";
        /*
         * fetchSourceHtml ouvre la page avec Playwright.
         *
         * La fonction onPage est exécutée avant page.content().
         * Cela permet de charger les matchs dynamiques avant
         * de transmettre le HTML final au parser Cheerio.
         */
        const html = await fetchSourceHtml(env.BETEXPLORER_BASE_URL, {
            forceBrowser: true,
            onPage: async (page) => {
                console.log("[matches] Browser page loaded, starting dynamic loading");
                const loadingResult = await loadAllMatches(page, MATCH_LIST_LOADING_OPTIONS);
                browserMatchCount =
                    loadingResult.finalCount;
                browserRawRowCount =
                    loadingResult.rawRowCount;
                scrollIterations =
                    loadingResult.iterations;
                successfulLoads =
                    loadingResult.successfulLoads;
                stagnantIterations =
                    loadingResult.stagnantIterations;
                scrollDurationMs =
                    loadingResult.durationMs;
                scrollStopReason =
                    loadingResult.stopReason;
                console.log("[matches] Browser loading result:", {
                    initialCount: loadingResult.initialCount,
                    finalCount: loadingResult.finalCount,
                    rawRowCount: loadingResult.rawRowCount,
                    expandedLeagues: loadingResult.expandedLeagues,
                    scrollPasses: loadingResult.scrollPasses,
                    idlePasses: loadingResult.idlePasses,
                    stopReason: loadingResult.stopReason,
                    scrollTarget: loadingResult.scrollTarget,
                });
            },
        });
        if (!html.trim()) {
            throw new Error("MATCH_LIST_EMPTY_HTML");
        }
        console.log(`[matches] Final HTML size: ${html.length} characters`);
        /*
         * Parser l'HTML final avec Cheerio.
         */
        const parseStarted = performance.now();
        const data = parseMatchList(html, HOMEPAGE_SCOPE);
        const parserDuration = elapsedMs(parseStarted);
        recordParserMs("matchList", parserDuration);
        const validationStarted = performance.now();
        console.log(`[matches] Cheerio parsed ${data.matches.length} unique matches ` +
            `in ${parserDuration} ms`);
        /*
         * Comparaison entre le nombre détecté dans le navigateur
         * et le nombre réellement produit par le parser.
         */
        if (browserMatchCount > 0 &&
            data.matches.length <
                browserMatchCount) {
            console.warn("[matches] Parser returned fewer matches than the browser:", {
                browserUniqueMatches: browserMatchCount,
                browserRawRows: browserRawRowCount,
                parsedMatches: data.matches.length,
                missingMatches: browserMatchCount -
                    data.matches.length,
            });
        }
        if (browserRawRowCount >
            browserMatchCount) {
            console.log("[matches] Raw rows contain duplicate or alternative match rows:", {
                rawRows: browserRawRowCount,
                uniqueBrowserMatches: browserMatchCount,
                duplicateRows: browserRawRowCount -
                    browserMatchCount,
            });
        }
        if (data.matches.length === 0) {
            throw new Error("MATCH_LIST_PARSE_FAILED");
        }
        /*
         * Ne pas remplacer un bon cache par un résultat
         * manifestement incomplet.
         *
         * Cette protection est volontairement prudente :
         * elle s'applique seulement lorsqu'un cache existe déjà
         * et que le nouveau résultat est très inférieur.
         */
        const previousEntry = matchListCache.get(HOMEPAGE_SCOPE);
        const previousCount = previousEntry?.data.matches
            .length ?? 0;
        validateMatchListRefresh(data, previousEntry?.data ?? null);
        if (previousCount >= 50 &&
            data.matches.length <
                Math.floor(previousCount * 0.5)) {
            throw new Error(`MATCH_LIST_SUSPICIOUS_DROP:` +
                `${previousCount}->${data.matches.length}`);
        }
        const validationDuration = elapsedMs(validationStarted);
        recordMatchListMetrics({
            lastInitialCount: browserMatchCount || data.matches.length,
            lastFinalCount: data.matches.length,
            lastScrollIterations: scrollIterations,
            lastSuccessfulLoads: successfulLoads,
            lastStagnantIterations: stagnantIterations,
            lastScrollDurationMs: scrollDurationMs,
            lastParseDurationMs: parserDuration,
            lastValidationDurationMs: validationDuration,
            lastTotalDurationMs: scrollDurationMs +
                parserDuration +
                validationDuration,
            matchesWithHomeLogo: data.matches.filter((match) => match.homeLogo).length,
            matchesWithAwayLogo: data.matches.filter((match) => match.awayLogo).length,
            matchesWithAnyOdds: data.matches.filter((match) => match.odds.available).length,
            matchesWithCompleteOdds: data.matches.filter((match) => match.odds.home !== null &&
                match.odds.draw !== null &&
                match.odds.away !== null).length,
            finishedMatches: data.matches.filter((match) => match.status === "FINISHED").length,
            finishedMatchesWithoutScore: data.matches.filter((match) => match.status === "FINISHED" &&
                (match.homeScore === null || match.awayScore === null)).length,
            lastStopReason: scrollStopReason,
        });
        /*
         * Enregistrer le résultat uniquement après validation.
         */
        setCacheEntry(matchListCache, HOMEPAGE_SCOPE, data);
        indexMatchList(data);
        console.log(`[matches] Cache updated successfully with ${data.matches.length} matches`);
        return data;
    }).catch((error) => {
        const message = errorMessage(error);
        console.error("[matches] Refresh failed:", message);
        recordCacheError(matchListCache, HOMEPAGE_SCOPE, message);
        throw error;
    });
}
function validateMatchListRefresh(next, previous) {
    if (!previous || previous.matches.length === 0) {
        return;
    }
    const previousHomeLogos = previous.matches.filter((match) => match.homeLogo).length;
    const previousAwayLogos = previous.matches.filter((match) => match.awayLogo).length;
    const previousOdds = previous.matches.filter((match) => match.odds.available).length;
    const previousFinishedScores = previous.matches.filter((match) => match.status === "FINISHED" &&
        match.homeScore !== null &&
        match.awayScore !== null).length;
    const nextHomeLogos = next.matches.filter((match) => match.homeLogo).length;
    const nextAwayLogos = next.matches.filter((match) => match.awayLogo).length;
    const nextOdds = next.matches.filter((match) => match.odds.available).length;
    const nextFinishedScores = next.matches.filter((match) => match.status === "FINISHED" &&
        match.homeScore !== null &&
        match.awayScore !== null).length;
    if (previousHomeLogos > 0 && nextHomeLogos === 0) {
        throw new Error("MATCH_LIST_LOGO_REGRESSION");
    }
    if (previousAwayLogos > 0 && nextAwayLogos === 0) {
        throw new Error("MATCH_LIST_LOGO_REGRESSION");
    }
    if (previousOdds > 0 && nextOdds === 0) {
        throw new Error("MATCH_LIST_ODDS_REGRESSION");
    }
    if (previousFinishedScores > 0 && nextFinishedScores === 0) {
        throw new Error("MATCH_LIST_SCORE_REGRESSION");
    }
}
//# sourceMappingURL=match-list.service.js.map