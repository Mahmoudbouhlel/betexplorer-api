import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type { MatchOddsDto } from "../types/index.js";
type NodeSet = cheerio.Cheerio<AnyNode>;
export declare function emptyMatchOdds(): MatchOddsDto;
export declare function parseOddsFromNodes(nodes: NodeSet): MatchOddsDto;
export declare function parseOddFromNode(node: NodeSet): number | null;
export {};
//# sourceMappingURL=odds.parser.d.ts.map