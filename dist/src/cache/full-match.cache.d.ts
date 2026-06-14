import type { CacheMetadata, MatchDetailsDto, MatchH2HDto, MatchRecentResultsDto, MatchStandingsDto, TeamResultsDto } from "../types/index.js";
import type { CacheEntry } from "./cache-entry.js";
export interface FullMatchDto {
    eventId: string;
    details: MatchDetailsDto | null;
    standings: MatchStandingsDto | null;
    h2h: MatchH2HDto | null;
    recentResults: MatchRecentResultsDto | null;
    teamResults: {
        home: TeamResultsDto | null;
        away: TeamResultsDto | null;
    } | null;
    cache: {
        details: CacheMetadata | null;
        standings: CacheMetadata | null;
        h2h: CacheMetadata | null;
        recentResults: CacheMetadata | null;
        teamResults: CacheMetadata | null;
    };
    warnings: string[];
}
export declare const fullMatchCache: Map<string, CacheEntry<FullMatchDto>>;
//# sourceMappingURL=full-match.cache.d.ts.map