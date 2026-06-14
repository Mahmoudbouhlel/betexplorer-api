import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type { HistoricalMatchDto, MatchH2HDto } from "../types/index.js";
type NodeSet = cheerio.Cheerio<AnyNode>;
export declare function parseH2H(html: string, eventId: string): MatchH2HDto;
export declare function parseHistoricalRow($: cheerio.CheerioAPI, row: NodeSet): HistoricalMatchDto;
export {};
//# sourceMappingURL=h2h.parser.d.ts.map