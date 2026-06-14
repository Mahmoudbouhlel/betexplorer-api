import type { MatchStatus } from "./common.types.js";
import type { BookmakerOddsDto, MatchOddsDto } from "./odds.types.js";
export interface MatchSummaryDto {
    eventId: string;
    eventUrl: string;
    relativeUrl: string;
    country: string | null;
    league: string | null;
    tournamentId: string | null;
    timestamp: number | null;
    dateTime: string | null;
    time: string | null;
    status: MatchStatus;
    homeTeam: string;
    awayTeam: string;
    homeLogo: string | null;
    awayLogo: string | null;
    homeScore: number | null;
    awayScore: number | null;
    odds: MatchOddsDto;
    rawDate: string | null;
}
export interface MatchDetailsDto {
    eventId: string;
    url: string;
    sport: string | null;
    homeTeam: {
        name: string;
        logo: string | null;
        id?: string | null;
        slug?: string | null;
        url?: string | null;
    };
    awayTeam: {
        name: string;
        logo: string | null;
        id?: string | null;
        slug?: string | null;
        url?: string | null;
    };
    competition: string | null;
    country: string | null;
    startDate: string | null;
    status: MatchStatus;
    venue: string | null;
    locality: string | null;
    homeScore: number | null;
    awayScore: number | null;
    odds: MatchOddsDto | null;
    referenceOdds?: MatchOddsDto | null;
    bookmakerOdds?: BookmakerOddsDto[];
    scrapedAt: string;
}
export interface MatchListDto {
    scope: string;
    count: number;
    matches: MatchSummaryDto[];
    scrapedAt: string;
}
//# sourceMappingURL=match.types.d.ts.map