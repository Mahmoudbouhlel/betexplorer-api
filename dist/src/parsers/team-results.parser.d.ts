import type { BetExplorerTeamReference, MatchRecentResultsDto, PaginationDto, TeamIdentityDto, TeamMatchDto, TeamMatchScoreDto, TeamResultsDto, TeamResultsSummaryDto, TeamTournamentFilterDto } from "../types/index.js";
export interface TeamPageSource {
    team: TeamIdentityDto;
    filters: {
        selectedTournamentId: string | null;
        availableTournaments: TeamTournamentFilterDto[];
    };
    matches: TeamMatchDto[];
    scrapedAt: string;
}
export interface TeamPageViewOptions {
    tournamentId?: string | null;
    page?: number;
    limit?: number;
    formLimit?: number;
}
export declare function parseRecentResults(html: string, eventId: string): MatchRecentResultsDto;
export declare function parseTeamResultsPage(html: string, reference: BetExplorerTeamReference): TeamResultsDto;
export declare function parseTeamFixturesSource(html: string, reference: BetExplorerTeamReference): TeamPageSource;
export declare function parseTeamResultsSource(html: string, reference: BetExplorerTeamReference): TeamPageSource;
export declare function applyTeamResultsView(source: TeamResultsDto, options: TeamPageViewOptions): TeamResultsDto;
export declare function applyTeamFixturesView(source: {
    team: TeamIdentityDto;
    filters?: {
        availableTournaments: TeamTournamentFilterDto[];
    };
    matches: TeamMatchDto[];
    scrapedAt: string;
}, options: TeamPageViewOptions): {
    team: TeamIdentityDto;
    matches: TeamMatchDto[];
    pagination: PaginationDto;
    scrapedAt: string;
};
export declare function sourceToResults(source: TeamPageSource): TeamResultsDto;
export declare function parseBetExplorerTeamScore(raw: string): TeamMatchScoreDto;
export declare function calculateTeamResultsSummary(matches: TeamMatchDto[], formLimit?: number): TeamResultsSummaryDto;
//# sourceMappingURL=team-results.parser.d.ts.map