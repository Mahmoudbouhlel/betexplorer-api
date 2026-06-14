import type { MatchDetailsDto, MatchStandingsDto } from "../types/index.js";
export declare function findStandingsAjaxUrl(html: string): string | null;
export declare function parseStandings(html: string, eventId: string, match?: Pick<MatchDetailsDto, "homeTeam" | "awayTeam" | "competition"> | null): MatchStandingsDto;
//# sourceMappingURL=standings.parser.d.ts.map