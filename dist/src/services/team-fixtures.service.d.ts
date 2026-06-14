import type { CachedResponse, TeamFixturesDto } from "../types/index.js";
import { type TeamResultsRequestOptions } from "./team-results.service.js";
export interface TeamFixturesRequestOptions extends TeamResultsRequestOptions {
    tournamentId?: string | null;
}
export declare function getTeamFixtures(teamId: string, options?: TeamFixturesRequestOptions): Promise<CachedResponse<TeamFixturesDto>>;
export declare function refreshTeamFixtures(teamId: string, options?: Pick<TeamFixturesRequestOptions, "slug" | "url">): Promise<TeamFixturesDto>;
export declare function teamFixturesCacheKey(teamId: string): string;
//# sourceMappingURL=team-fixtures.service.d.ts.map