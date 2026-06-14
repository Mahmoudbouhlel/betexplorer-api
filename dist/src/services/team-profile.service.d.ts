import type { CachedResponse, MatchTeamsDto, TeamProfileDto } from "../types/index.js";
import { type TeamResultsRequestOptions } from "./team-results.service.js";
export interface TeamProfileRequestOptions extends TeamResultsRequestOptions {
    includeResults?: boolean;
    includeFixtures?: boolean;
    resultsLimit?: number;
    fixturesLimit?: number;
}
export declare function getTeamProfile(teamId: string, options?: TeamProfileRequestOptions): Promise<CachedResponse<TeamProfileDto>>;
export declare function refreshTeamProfile(teamId: string, options?: TeamProfileRequestOptions): Promise<TeamProfileDto>;
export declare function getMatchTeams(eventId: string, options?: {
    url?: string;
    force?: boolean;
    backgroundRefresh?: boolean;
}): Promise<CachedResponse<MatchTeamsDto>>;
export declare function refreshMatchTeams(eventId: string, url?: string): Promise<MatchTeamsDto>;
export declare function parseMatchTeamsFromHtml(html: string, eventId: string, matchUrl: string): MatchTeamsDto;
//# sourceMappingURL=team-profile.service.d.ts.map