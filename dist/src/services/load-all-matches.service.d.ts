import type { Page } from "playwright";
export interface InfiniteScrollResult {
    initialCount: number;
    finalCount: number;
    uniqueEventIds: string[];
    iterations: number;
    successfulLoads: number;
    stagnantIterations: number;
    reachedBottom: boolean;
    stopReason: "NO_NEW_MATCHES" | "BOTTOM_REACHED" | "SHOW_MORE_EXHAUSTED" | "MAX_ITERATIONS" | "MAX_DURATION" | "ABORTED" | "ERROR";
    durationMs: number;
}
export type ScrollTarget = {
    type: "WINDOW";
} | {
    type: "ELEMENT";
    selector: string;
};
export interface ScrollMetrics {
    scrollTop: number;
    clientHeight: number;
    scrollHeight: number;
    distanceToBottom: number;
    atBottom: boolean;
}
export interface LoadAllMatchesOptions {
    maxPasses?: number;
    maxIdlePasses?: number;
    waitAfterActionMs?: number;
    initialTimeoutMs?: number;
    maxIterations?: number;
    maxDurationMs?: number;
    stepRatio?: number;
    minimumStepPx?: number;
    stableChecks?: number;
    stableIntervalMs?: number;
    bottomTolerancePx?: number;
    showMoreMaxClicks?: number;
    signal?: AbortSignal;
}
export interface LoadAllMatchesResult extends InfiniteScrollResult {
    rawRowCount: number;
    expandedLeagues: number;
    scrollPasses: number;
    idlePasses: number;
    scrollTarget: ScrollTarget;
}
export declare function getVisibleMatchEventIds(page: Page): Promise<string[]>;
export declare function loadAllMatches(page: Page, options?: LoadAllMatchesOptions): Promise<LoadAllMatchesResult>;
//# sourceMappingURL=load-all-matches.service.d.ts.map