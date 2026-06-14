import type { MatchStatus } from "./common.types.js";

export type AnalysisMode = "PRE_MATCH" | "LIVE" | "POST_MATCH" | "UNAVAILABLE";
export type RecommendationDecision = "BET_CANDIDATE" | "NO_BET" | "POST_MATCH_ONLY" | "UNAVAILABLE";
export type AnalysisLabel = "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
export type MatchRecommendationMarket =
  | "HOME"
  | "DRAW"
  | "AWAY"
  | "HOME_OR_DRAW"
  | "DRAW_OR_AWAY"
  | "HOME_OR_AWAY"
  | "OVER_1_5"
  | "UNDER_1_5"
  | "OVER_2_5"
  | "UNDER_2_5"
  | "BTTS_YES"
  | "BTTS_NO"
  | "NO_BET";
export type AnalysisRisk = "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";

export interface AnalysisQualityDto {
  score: number;
  level: "INSUFFICIENT" | "LOW" | "MEDIUM" | "HIGH";
  formula: string;
  missing: string[];
}

export interface MarketAnalysisDto {
  rawImplied: {
    home: number | null;
    draw: number | null;
    away: number | null;
  };
  normalized: {
    home: number | null;
    draw: number | null;
    away: number | null;
  };
  overround: number | null;
  formula: string;
}

export interface BetCandidateDto {
  type: "HOME" | "DRAW" | "AWAY";
  modelProbability: number;
  marketProbability: number;
  edgePercentagePoints: number;
  expectedValue: number;
}

export interface MatchAnalysisDto {
  eventId: string;
  status: MatchStatus;
  mode: AnalysisMode;
  probabilities: {
    home: number | null;
    draw: number | null;
    away: number | null;
  };
  market: MarketAnalysisDto;
  dataQuality: AnalysisQualityDto;
  confidence: AnalysisQualityDto;
  candidates: BetCandidateDto[];
  recommendation: {
    decision: RecommendationDecision;
    primaryCandidate: BetCandidateDto | null;
    reasons: string[];
  };
  supportingFactors: string[];
  contradictions: string[];
  actualResult: {
    homeScore: number;
    awayScore: number;
    outcome: "HOME" | "DRAW" | "AWAY";
    btts: boolean;
    over25: boolean;
  } | null;
  generatedAt: string;
}

export interface QuickAnalysisRequestDto {
  eventIds: string[];
}

export interface QuickRecommendationDto {
  market: MatchRecommendationMarket;
  label: string;
  probability: number | null;
  decimalOdd: number | null;
  edgePercentagePoints: number | null;
  expectedValuePercent: number | null;
  confidenceScore: number;
  risk: AnalysisRisk;
  eligible: boolean;
}

export interface QuickMatchAnalysisDto {
  eventId: string;
  status: MatchStatus;
  mode: AnalysisMode;
  decision: RecommendationDecision;
  primaryRecommendation: QuickRecommendationDto | null;
  alternativeRecommendations: QuickRecommendationDto[];
  probabilities: {
    home: number | null;
    draw: number | null;
    away: number | null;
    over15: number | null;
    under15: number | null;
    over25: number | null;
    under25: number | null;
    bttsYes: number | null;
    bttsNo: number | null;
  };
  expectedGoals: {
    home: number | null;
    away: number | null;
    total: number | null;
  };
  form: {
    home: string | null;
    away: string | null;
    homeSampleSize: number;
    awaySampleSize: number;
  };
  stats: {
    homeAverageScored: number | null;
    awayAverageScored: number | null;
    homeAverageConceded: number | null;
    awayAverageConceded: number | null;
    homeOver15Rate: number | null;
    awayOver15Rate: number | null;
    homeOver25Rate: number | null;
    awayOver25Rate: number | null;
    homeBttsRate: number | null;
    awayBttsRate: number | null;
    h2hMatches: number;
    h2hOver15Rate: number | null;
    h2hOver25Rate: number | null;
    h2hBttsRate: number | null;
  };
  dataQuality: {
    score: number;
    label: AnalysisLabel;
  };
  confidence: {
    score: number;
    label: AnalysisLabel;
  };
  risk: AnalysisRisk;
  supportingFactors: string[];
  contradictions: string[];
  rejectionReasons: string[];
  generatedAt: string;
}
