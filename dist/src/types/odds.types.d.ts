export interface MatchOddsDto {
    home: number | null;
    draw: number | null;
    away: number | null;
    homeOutcomeId: string | null;
    drawOutcomeId: string | null;
    awayOutcomeId: string | null;
    available: boolean;
}
export interface BookmakerOddsDto {
    bookmakerId: string | null;
    bookmakerName: string | null;
    home: number | null;
    draw: number | null;
    away: number | null;
    createdAt: string | null;
}
//# sourceMappingURL=odds.types.d.ts.map