import type { CachedResponse, MatchStandingsDto } from "../types/index.js";
export declare function getMatchStandings(eventId: string, options?: {
    url?: string;
    force?: boolean;
    backgroundRefresh?: boolean;
}): Promise<CachedResponse<MatchStandingsDto>>;
export declare function refreshMatchStandings(eventId: string, url?: string): Promise<MatchStandingsDto>;
//# sourceMappingURL=standings.service.d.ts.map