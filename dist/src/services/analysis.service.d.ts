import type { MatchAnalysisDto } from "../types/index.js";
export declare function getMatchAnalysis(eventId: string, options?: {
    url?: string;
}): Promise<{
    data: MatchAnalysisDto;
    warnings: string[];
}>;
//# sourceMappingURL=analysis.service.d.ts.map