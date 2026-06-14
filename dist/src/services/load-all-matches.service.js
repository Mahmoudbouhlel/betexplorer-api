import { selectors } from "../constants/selectors.js";
import { env } from "../config/env.js";
const nestedScrollSelectors = [
    "#content",
    "#js-leagueresults",
    ".leagues-list",
    ".table-main",
    ".content",
    ".container",
];
export async function getVisibleMatchEventIds(page) {
    return page.evaluate((selector) => {
        return Array.from(document.querySelectorAll(selector))
            .map((row) => row.getAttribute("data-event-id")?.trim() ?? "")
            .filter(Boolean);
    }, selectors.matchList.matchRow);
}
export async function loadAllMatches(page, options = {}) {
    const started = performance.now();
    const maxIterations = options.maxIterations ?? options.maxPasses ?? env.MATCH_LIST_SCROLL_MAX_ITERATIONS;
    const maxStagnantIterations = options.maxIdlePasses ?? env.MATCH_LIST_SCROLL_MAX_STAGNANT_ITERATIONS;
    const maxDurationMs = options.maxDurationMs ?? env.MATCH_LIST_SCROLL_MAX_DURATION_MS;
    const waitTimeoutMs = options.waitAfterActionMs ?? env.MATCH_LIST_SCROLL_WAIT_TIMEOUT_MS;
    const stepRatio = options.stepRatio ?? env.MATCH_LIST_SCROLL_STEP_RATIO;
    const minimumStepPx = options.minimumStepPx ?? env.MATCH_LIST_SCROLL_MIN_STEP_PX;
    const stableChecks = options.stableChecks ?? env.MATCH_LIST_SCROLL_STABLE_CHECKS;
    const stableIntervalMs = options.stableIntervalMs ?? env.MATCH_LIST_SCROLL_STABLE_INTERVAL_MS;
    const bottomTolerancePx = options.bottomTolerancePx ?? env.MATCH_LIST_SCROLL_BOTTOM_TOLERANCE_PX;
    const showMoreMaxClicks = options.showMoreMaxClicks ?? env.MATCH_LIST_SHOW_MORE_MAX_CLICKS;
    const rowSelector = selectors.matchList.matchRow;
    const rows = page.locator(rowSelector);
    try {
        await rows.first().waitFor({
            state: "attached",
            timeout: options.initialTimeoutMs ?? 30_000,
        });
    }
    catch {
        return emptyResult("NO_NEW_MATCHES", performance.now() - started);
    }
    await page.waitForTimeout(env.MATCH_LIST_SCROLL_TOP_PAUSE_MS);
    const scrollTarget = await detectScrollTarget(page);
    const initialIds = unique(await getVisibleMatchEventIds(page));
    const initialCount = initialIds.length;
    let currentIds = initialIds;
    let iterations = 0;
    let successfulLoads = 0;
    let stagnantIterations = 0;
    let showMoreClicks = 0;
    let reachedBottom = false;
    let stopReason = "NO_NEW_MATCHES";
    if (!env.MATCH_LIST_SCROLL_ENABLED) {
        const counts = await getPageCounts(page, rowSelector);
        return buildResult({
            initialCount,
            finalIds: currentIds,
            counts,
            iterations,
            successfulLoads,
            stagnantIterations,
            reachedBottom,
            stopReason,
            durationMs: performance.now() - started,
            expandedLeagues: showMoreClicks,
            scrollTarget,
        });
    }
    for (; iterations < maxIterations; iterations += 1) {
        if (options.signal?.aborted) {
            stopReason = "ABORTED";
            break;
        }
        if (performance.now() - started > maxDurationMs) {
            stopReason = "MAX_DURATION";
            break;
        }
        const previousSignature = eventIdSignature(currentIds);
        const beforeMetrics = await getScrollMetrics(page, scrollTarget, bottomTolerancePx);
        const clickedShowMore = showMoreClicks < showMoreMaxClicks ? await clickShowMore(page) : false;
        if (clickedShowMore) {
            showMoreClicks += 1;
        }
        await scrollByTarget(page, scrollTarget, stepRatio, minimumStepPx);
        await scrollLastMatchIntoView(page);
        await page.waitForTimeout(env.MATCH_LIST_SCROLL_AFTER_LOAD_PAUSE_MS);
        const changed = await waitForNewEventId(page, rowSelector, previousSignature, waitTimeoutMs);
        const afterMetrics = await getScrollMetrics(page, scrollTarget, bottomTolerancePx);
        const idsAfterWait = changed.changed ? changed.ids : unique(await getVisibleMatchEventIds(page));
        const newSignature = eventIdSignature(idsAfterWait);
        const newIdsLoaded = newSignature !== previousSignature;
        const heightGrew = afterMetrics.scrollHeight > beforeMetrics.scrollHeight + 20;
        const madeProgress = newIdsLoaded || heightGrew || clickedShowMore;
        reachedBottom = afterMetrics.atBottom;
        currentIds = idsAfterWait;
        if (madeProgress) {
            successfulLoads += 1;
            stagnantIterations = 0;
            continue;
        }
        stagnantIterations += 1;
        if (reachedBottom && stagnantIterations >= stableChecks) {
            const stable = await waitForStableSignature(page, rowSelector, stableChecks, stableIntervalMs);
            currentIds = stable.ids;
            if (stable.stable) {
                stopReason = "BOTTOM_REACHED";
                break;
            }
        }
        if (stagnantIterations >= maxStagnantIterations) {
            stopReason = showMoreClicks >= showMoreMaxClicks ? "SHOW_MORE_EXHAUSTED" : "NO_NEW_MATCHES";
            break;
        }
    }
    if (iterations >= maxIterations) {
        stopReason = "MAX_ITERATIONS";
    }
    const finalStable = await waitForStableSignature(page, rowSelector, stableChecks, stableIntervalMs);
    currentIds = finalStable.ids;
    const counts = await getPageCounts(page, rowSelector);
    return buildResult({
        initialCount,
        finalIds: currentIds,
        counts,
        iterations,
        successfulLoads,
        stagnantIterations,
        reachedBottom,
        stopReason,
        durationMs: performance.now() - started,
        expandedLeagues: showMoreClicks,
        scrollTarget,
    });
}
async function detectScrollTarget(page) {
    return page.evaluate((candidates) => {
        for (const selector of candidates) {
            const element = document.querySelector(selector);
            if (!(element instanceof HTMLElement))
                continue;
            const style = window.getComputedStyle(element);
            if (!/auto|scroll/i.test(style.overflowY))
                continue;
            if (element.scrollHeight > element.clientHeight) {
                return { type: "ELEMENT", selector };
            }
        }
        return { type: "WINDOW" };
    }, nestedScrollSelectors);
}
async function getPageCounts(page, rowSelector) {
    return page.evaluate((selector) => {
        const rows = Array.from(document.querySelectorAll(selector));
        const ids = rows.map((row) => row.getAttribute("data-event-id")).filter((id) => Boolean(id));
        const hiddenRows = rows.filter((row) => {
            if (!(row instanceof HTMLElement))
                return false;
            const style = window.getComputedStyle(row);
            return row.hidden || style.display === "none" || style.visibility === "hidden";
        }).length;
        return {
            uniqueMatches: new Set(ids).size,
            rawRows: rows.length,
            hiddenRows,
        };
    }, rowSelector);
}
async function getScrollMetrics(page, target, bottomTolerancePx) {
    return page.evaluate(({ scrollTarget, tolerance }) => {
        const element = scrollTarget.type === "ELEMENT"
            ? document.querySelector(scrollTarget.selector)
            : document.scrollingElement ?? document.documentElement;
        const source = element instanceof HTMLElement ? element : document.documentElement;
        const scrollTop = scrollTarget.type === "WINDOW" ? window.scrollY : source.scrollTop;
        const clientHeight = scrollTarget.type === "WINDOW" ? window.innerHeight : source.clientHeight;
        const scrollHeight = source.scrollHeight;
        const distanceToBottom = Math.max(0, scrollHeight - scrollTop - clientHeight);
        return {
            scrollTop,
            clientHeight,
            scrollHeight,
            distanceToBottom,
            atBottom: distanceToBottom <= tolerance,
        };
    }, { scrollTarget: target, tolerance: bottomTolerancePx });
}
async function scrollByTarget(page, target, stepRatio, minimumStepPx) {
    await page.evaluate(({ scrollTarget, ratio, minStep }) => {
        const element = scrollTarget.type === "ELEMENT"
            ? document.querySelector(scrollTarget.selector)
            : document.scrollingElement ?? document.documentElement;
        const source = element instanceof HTMLElement ? element : document.documentElement;
        const clientHeight = scrollTarget.type === "WINDOW" ? window.innerHeight : source.clientHeight;
        const step = Math.max(minStep, Math.floor(clientHeight * ratio));
        if (scrollTarget.type === "WINDOW") {
            window.scrollBy({ top: step, behavior: "instant" });
        }
        else {
            source.scrollTop += step;
        }
    }, { scrollTarget: target, ratio: stepRatio, minStep: minimumStepPx });
}
async function scrollLastMatchIntoView(page) {
    await page
        .locator(selectors.matchList.matchRow)
        .last()
        .scrollIntoViewIfNeeded()
        .catch(() => undefined);
}
async function waitForNewEventId(page, rowSelector, previousSignature, timeoutMs) {
    try {
        const ids = await page.waitForFunction(({ selector, signature }) => {
            const eventIds = Array.from(document.querySelectorAll(selector))
                .map((row) => row.getAttribute("data-event-id")?.trim() ?? "")
                .filter(Boolean);
            const currentSignature = Array.from(new Set(eventIds)).sort().join("|");
            return currentSignature !== signature ? eventIds : false;
        }, { selector: rowSelector, signature: previousSignature }, { timeout: timeoutMs, polling: 250 });
        const value = await ids.jsonValue();
        return {
            changed: Array.isArray(value),
            ids: Array.isArray(value)
                ? unique(value)
                : unique(await getVisibleMatchEventIds(page)),
        };
    }
    catch {
        return { changed: false, ids: unique(await getVisibleMatchEventIds(page)) };
    }
}
async function waitForStableSignature(page, rowSelector, checks, intervalMs) {
    let previous = "";
    let ids = [];
    for (let index = 0; index < checks; index += 1) {
        ids = unique(await getVisibleMatchEventIds(page));
        const signature = eventIdSignature(ids);
        if (index > 0 && signature !== previous) {
            return { stable: false, ids };
        }
        previous = signature;
        await page.waitForTimeout(intervalMs);
    }
    return { stable: true, ids };
}
async function clickShowMore(page) {
    return page.evaluate(() => {
        const candidates = Array.from(document.querySelectorAll("button,a,[role='button']"));
        for (const candidate of candidates) {
            if (!(candidate instanceof HTMLElement))
                continue;
            const text = (candidate.textContent ?? "").trim().toLowerCase();
            if (!/^(show more matches|show more|more matches|load more)$/i.test(text))
                continue;
            if (candidate.closest("#H2HComponent,#bestOddsComponent,#lastResultsComponent,footer,[class*='advert'],[id*='advert']"))
                continue;
            if (candidate.hasAttribute("disabled") || candidate.getAttribute("aria-disabled") === "true")
                continue;
            candidate.click();
            return true;
        }
        return false;
    });
}
function unique(ids) {
    return Array.from(new Set(ids.filter(Boolean)));
}
function eventIdSignature(ids) {
    return ids.slice().sort().join("|");
}
function emptyResult(stopReason, durationMs) {
    return {
        initialCount: 0,
        finalCount: 0,
        rawRowCount: 0,
        uniqueEventIds: [],
        expandedLeagues: 0,
        iterations: 0,
        scrollPasses: 0,
        successfulLoads: 0,
        stagnantIterations: 0,
        idlePasses: 0,
        reachedBottom: true,
        stopReason,
        durationMs,
        scrollTarget: { type: "WINDOW" },
    };
}
function buildResult(input) {
    return {
        initialCount: input.initialCount,
        finalCount: input.finalIds.length,
        rawRowCount: input.counts.rawRows,
        uniqueEventIds: input.finalIds,
        expandedLeagues: input.expandedLeagues,
        iterations: input.iterations,
        scrollPasses: input.iterations,
        successfulLoads: input.successfulLoads,
        stagnantIterations: input.stagnantIterations,
        idlePasses: input.stagnantIterations,
        reachedBottom: input.reachedBottom,
        stopReason: input.stopReason,
        durationMs: Math.round(input.durationMs),
        scrollTarget: input.scrollTarget,
    };
}
//# sourceMappingURL=load-all-matches.service.js.map