import type { MatchOddsDto } from "./odds.types.js";

export interface H2HSummaryDto {
  totalMatches: number;
  homeWins: number;
  draws: number;
  awayWins: number;
  homeWinPercent: number | null;
  drawPercent: number | null;
  awayWinPercent: number | null;
}

export interface HistoricalMatchDto {
  eventId: string | null;
  dateTime: string | null;
  competition: string | null;
  country: string | null;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string | null;
  awayLogo: string | null;
  homeScore: number | null;
  awayScore: number | null;
  outcome: "HOME_WIN" | "DRAW" | "AWAY_WIN" | "UNKNOWN";
  odds: MatchOddsDto;
  url: string | null;
}

export interface MatchH2HDto {
  eventId: string;
  summary: H2HSummaryDto;
  matches: HistoricalMatchDto[];
  scrapedAt: string;
}
