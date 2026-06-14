import type { CachedResponse, MatchListDto } from "../types/index.js";
export declare function getMatchList(options?: {
    force?: boolean;
    backgroundRefresh?: boolean;
}): Promise<CachedResponse<MatchListDto>>;
export declare function refreshMatchList(): Promise<MatchListDto>;
//# sourceMappingURL=match-list.service.d.ts.map