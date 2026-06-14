import * as cheerio from "cheerio";
import type { MatchDetailsDto } from "../types/index.js";
interface StructuredSportsEvent {
    name: string | null;
    startDate: string | null;
    eventStatus: string | null;
    url: string | null;
    venue: string | null;
    locality: string | null;
    country: string | null;
    homeTeamName: string | null;
    awayTeamName: string | null;
    homeTeamLogo: string | null;
    awayTeamLogo: string | null;
    competition: string | null;
}
export declare function parseMatchDetails(html: string, url: string, eventId?: string): MatchDetailsDto;
export declare function findSportsEventJsonLd($: cheerio.CheerioAPI): StructuredSportsEvent | null;
export {};
//# sourceMappingURL=match-details.parser.d.ts.map