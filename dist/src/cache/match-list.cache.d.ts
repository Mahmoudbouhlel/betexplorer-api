import type { MatchListDto, MatchSummaryDto } from "../types/index.js";
import type { CacheEntry } from "./cache-entry.js";
export declare const matchListCache: Map<string, CacheEntry<MatchListDto>>;
export declare const matchUrlCache: Map<string, string>;
export declare const matchSummaryCache: Map<string, MatchSummaryDto>;
export declare function indexMatchList(data: MatchListDto): void;
export declare function getKnownMatchUrl(eventId: string): string | null;
export declare function getKnownMatchSummary(eventId: string): MatchSummaryDto | null;
//# sourceMappingURL=match-list.cache.d.ts.map