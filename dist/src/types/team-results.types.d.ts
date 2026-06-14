import type { HistoricalMatchDto } from "./h2h.types.js";
export type FormResult = "W" | "D" | "L" | "?";
export interface TeamRecentResultsDto {
    team: string;
    teamLogo: string | null;
    form: FormResult[];
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    matches: HistoricalMatchDto[];
    scrapedAt: string;
}
export interface MatchRecentResultsDto {
    eventId: string;
    home: TeamRecentResultsDto;
    away: TeamRecentResultsDto;
    scrapedAt: string;
}
//# sourceMappingURL=team-results.types.d.ts.map