import type { FormResult } from "./team-results.types.js";
export interface StandingRowDto {
    rank: number | null;
    team: string;
    teamId: string | null;
    teamUrl: string | null;
    logo: string | null;
    played: number | null;
    wins: number | null;
    draws: number | null;
    losses: number | null;
    goalsFor: number | null;
    goalsAgainst: number | null;
    goalDifference: number | null;
    points: number | null;
    form: FormResult[];
    qualification: string | null;
}
export interface StandingGroupDto {
    name: string | null;
    rows: StandingRowDto[];
}
export interface MatchStandingsDto {
    eventId: string;
    competition: string | null;
    groups: StandingGroupDto[];
    homeTeamRank: number | null;
    awayTeamRank: number | null;
    homeTeamRow: StandingRowDto | null;
    awayTeamRow: StandingRowDto | null;
    scrapedAt: string;
}
//# sourceMappingURL=standings.types.d.ts.map