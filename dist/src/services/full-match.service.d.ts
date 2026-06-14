import { type FullMatchDto } from "../cache/full-match.cache.js";
import type { CachedResponse } from "../types/index.js";
export declare function getFullMatch(eventId: string, options?: {
    url?: string;
    backgroundRefresh?: boolean;
    includeDetails?: boolean;
    includeStandings?: boolean;
    includeH2H?: boolean;
    includeRecentResults?: boolean;
    includeTeamResults?: boolean;
    teamResultsLimit?: number;
    force?: boolean;
}): Promise<CachedResponse<FullMatchDto>>;
export declare function refreshFullMatch(eventId: string, url?: string, options?: {
    includeDetails?: boolean;
    includeStandings?: boolean;
    includeH2H?: boolean;
    includeRecentResults?: boolean;
    includeTeamResults?: boolean;
    teamResultsLimit?: number;
}): Promise<FullMatchDto>;
//# sourceMappingURL=full-match.service.d.ts.map