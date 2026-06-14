export const matchListCache = new Map();
export const matchUrlCache = new Map();
export const matchSummaryCache = new Map();
export function indexMatchList(data) {
    for (const match of data.matches) {
        matchUrlCache.set(match.eventId, match.eventUrl);
        matchSummaryCache.set(match.eventId, match);
    }
}
export function getKnownMatchUrl(eventId) {
    return matchUrlCache.get(eventId) ?? null;
}
export function getKnownMatchSummary(eventId) {
    return matchSummaryCache.get(eventId) ?? null;
}
//# sourceMappingURL=match-list.cache.js.map