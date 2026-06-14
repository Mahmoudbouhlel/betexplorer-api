import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
type CheerioNode = cheerio.Cheerio<AnyNode>;
export declare function cleanText(value: string | null | undefined): string;
export declare function safeText(node: CheerioNode | null | undefined): string | null;
export declare function normalizeTeamName(value: string | null | undefined): string;
export declare function safeArray<T>(value: T[] | null | undefined): T[];
export {};
//# sourceMappingURL=text.d.ts.map