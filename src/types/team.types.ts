import type { CacheMetadata, MatchStatus } from "./common.types.js";

export interface BetExplorerTeamReference {
  slug: string;
  teamId: string;
  baseUrl: string;
  resultsUrl: string;
  fixturesUrl: string;
}

export type TeamMatchResult = "W" | "D" | "L" | "UNKNOWN";

export type TeamPosition = "HOME" | "AWAY" | "UNKNOWN";

export interface TeamIdentityDto {
  teamId: string;
  slug: string;
  name: string;
  summaryUrl: string;
  resultsUrl: string;
  fixturesUrl: string;
  logo: string | null;
}

export interface TeamTournamentDto {
  tournamentId: string | null;
  seasonId: string | null;
  country: string | null;
  competition: string | null;
  stage: string | null;
  tournamentUrl: string | null;
}

export interface TeamMatchTeamDto {
  name: string;
  teamId: string | null;
  teamUrl: string | null;
}

export interface TeamMatchScoreDto {
  home: number | null;
  away: number | null;
  halfTimeHome: number | null;
  halfTimeAway: number | null;
  secondHalfHome: number | null;
  secondHalfAway: number | null;
  raw: string | null;
}

export interface TeamMatchOddsDto {
  home: number | null;
  draw: number | null;
  away: number | null;
}

export interface TeamMatchDto {
  eventId: string | null;
  eventUrl: string | null;
  date: string | null;
  dateTime: string | null;
  tournament: TeamTournamentDto;
  homeTeam: TeamMatchTeamDto;
  awayTeam: TeamMatchTeamDto;
  selectedTeamPosition: TeamPosition;
  selectedTeamResult: TeamMatchResult;
  score: TeamMatchScoreDto;
  odds: TeamMatchOddsDto;
  status: MatchStatus;
}

export interface TeamResultsSummaryDto {
  totalMatches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  cleanSheets: number;
  failedToScore: number;
  bothTeamsScored: number;
  over15: number;
  over25: number;
  under25: number;
  homeMatches: number;
  awayMatches: number;
  homeWins: number;
  awayWins: number;
  form: TeamMatchResult[];
  winRate: number | null;
  drawRate: number | null;
  lossRate: number | null;
  averageGoalsFor: number | null;
  averageGoalsAgainst: number | null;
  averageTotalGoals: number | null;
}

export interface PaginationDto {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface TeamTournamentGroupDto {
  tournament: TeamTournamentDto;
  matches: TeamMatchDto[];
}

export interface TeamTournamentFilterDto {
  id: string;
  label: string;
}

export interface TeamResultsDto {
  team: TeamIdentityDto;
  filters: {
    selectedTournamentId: string | null;
    availableTournaments: TeamTournamentFilterDto[];
  };
  tournaments: TeamTournamentGroupDto[];
  matches: TeamMatchDto[];
  summary: TeamResultsSummaryDto;
  pagination: PaginationDto;
  scrapedAt: string;
}

export interface TeamFixturesDto {
  team: TeamIdentityDto;
  matches: TeamMatchDto[];
  pagination: PaginationDto;
  scrapedAt: string;
}

export interface TeamProfileDto {
  team: TeamIdentityDto;
  results: TeamResultsDto | null;
  fixtures: TeamFixturesDto | null;
  warnings: string[];
}

export interface TeamReferenceDto {
  name: string;
  teamId: string;
  slug: string;
  summaryUrl: string;
  resultsUrl: string;
  fixturesUrl: string;
}

export interface MatchTeamsDto {
  eventId: string;
  home: TeamReferenceDto | null;
  away: TeamReferenceDto | null;
  scrapedAt: string;
}

export interface TeamResultsCacheMetadata {
  results: CacheMetadata | null;
  fixtures: CacheMetadata | null;
  profile: CacheMetadata | null;
}
