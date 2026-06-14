import type { CachedResponse, MatchDetailsDto } from "../types/index.js";
import type { Page } from "playwright";
export declare function getMatchDetails(eventId: string, options?: {
    url?: string;
    force?: boolean;
    backgroundRefresh?: boolean;
}): Promise<CachedResponse<MatchDetailsDto>>;
export declare function refreshMatchDetails(eventId: string, url?: string): Promise<MatchDetailsDto>;
export declare function resolveMatchUrl(eventId: string, url?: string): string;
export declare function waitForMatchDetailReady(page: Page): Promise<void>;
//# sourceMappingURL=match-details.service.d.ts.map