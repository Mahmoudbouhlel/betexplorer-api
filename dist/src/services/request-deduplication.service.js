export const activeMatchLists = new Map();
export const activeDetails = new Map();
export const activeStandings = new Map();
export const activeH2H = new Map();
export const activeRecentResults = new Map();
export const activeFullMatches = new Map();
export const activeTeamResults = new Map();
export const activeTeamFixtures = new Map();
export const activeTeamProfiles = new Map();
export const activeMatchTeams = new Map();
export function dedupe(map, key, factory) {
    const active = map.get(key);
    if (active)
        return active;
    const promise = factory();
    map.set(key, promise);
    return promise.finally(() => {
        map.delete(key);
    });
}
//# sourceMappingURL=request-deduplication.service.js.map