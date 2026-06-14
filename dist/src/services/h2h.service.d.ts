import type { CachedResponse, MatchH2HDto } from "../types/index.js";
export declare function getMatchH2H(eventId: string, options?: {
    url?: string;
    force?: boolean;
    backgroundRefresh?: boolean;
}): Promise<CachedResponse<MatchH2HDto>>;
export declare function refreshMatchH2H(eventId: string, url?: string): Promise<MatchH2HDto>;
//# sourceMappingURL=h2h.service.d.ts.map