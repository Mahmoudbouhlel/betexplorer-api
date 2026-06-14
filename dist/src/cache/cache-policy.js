import { env } from "../config/env.js";
export const cacheTtl = {
    matchList: env.MATCH_LIST_TTL_SECONDS,
    details: env.MATCH_DETAILS_TTL_SECONDS,
    standings: env.STANDINGS_TTL_SECONDS,
    h2h: env.H2H_TTL_SECONDS,
    recentResults: env.TEAM_RESULTS_TTL_SECONDS,
    teamResults: env.TEAM_RESULTS_TTL_SECONDS,
    teamFixtures: env.TEAM_FIXTURES_TTL_SECONDS,
    teamProfile: env.TEAM_PROFILE_TTL_SECONDS,
};
export function fullMatchTtlSeconds() {
    return Math.min(cacheTtl.details, cacheTtl.standings, cacheTtl.h2h, cacheTtl.recentResults, cacheTtl.teamResults);
}
//# sourceMappingURL=cache-policy.js.map