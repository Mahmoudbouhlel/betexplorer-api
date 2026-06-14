import type { QuickMatchAnalysisDto } from "../types/index.js";
export declare const QUICK_ANALYSIS_BATCH_SIZE = 30;
export declare const QUICK_ANALYSIS_CONCURRENCY = 3;
export declare function getQuickMatchAnalyses(eventIds: string[]): Promise<QuickMatchAnalysisDto[]>;
export declare function getQuickMatchAnalysis(eventId: string): Promise<QuickMatchAnalysisDto>;
//# sourceMappingURL=quick-analysis.service.d.ts.map