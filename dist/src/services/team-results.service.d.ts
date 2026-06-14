import type { BetExplorerTeamReference, CachedResponse, MatchRecentResultsDto, TeamResultsDto } from "../types/index.js";
export interface TeamResultsRequestOptions {
    slug?: string;
    url?: string;
    tournamentId?: string | null;
    page?: number;
    limit?: number;
    formLimit?: number;
    force?: boolean;
    backgroundRefresh?: boolean;
}
export declare function getRecentResults(eventId: string, options?: {
    url?: string;
    force?: boolean;
    backgroundRefresh?: boolean;
    limit?: number;
}): Promise<CachedResponse<MatchRecentResultsDto>>;
export declare function refreshRecentResults(eventId: string, url?: string): Promise<MatchRecentResultsDto>;
export declare function getTeamResults(teamId: string, options?: TeamResultsRequestOptions): Promise<CachedResponse<TeamResultsDto>>;
export declare function refreshTeamResults(teamId: string, options?: Pick<TeamResultsRequestOptions, "slug" | "url">): Promise<TeamResultsDto>;
export declare function resolveTeamReference(teamId: string, options: Pick<TeamResultsRequestOptions, "slug" | "url">): BetExplorerTeamReference;
export declare function teamResultsCacheKey(teamId: string): string;
//# sourceMappingURL=team-results.service.d.ts.map