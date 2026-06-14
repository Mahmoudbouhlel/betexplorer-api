import type { BetExplorerTeamReference } from "../types/index.js";
export declare function validateEventId(eventId: string): string;
export declare function validateTeamId(teamId: string): string;
export declare function validateTeamSlug(slug: string): string;
export declare function validateBetExplorerUrl(url: string): URL;
export declare function parseTeamReferenceFromUrl(url: string): BetExplorerTeamReference;
export declare function buildTeamResultsUrl(slug: string, teamId: string): string;
export declare function buildTeamFixturesUrl(slug: string, teamId: string): string;
export declare function buildTeamReference(slug: string, teamId: string): BetExplorerTeamReference;
export declare function absoluteBetExplorerUrl(value: string | null | undefined): string | null;
export declare function relativeBetExplorerUrl(value: string | null | undefined): string | null;
export declare function extractEventIdFromUrl(url: string | null | undefined): string | null;
export declare function extractTeamIdFromTeamUrl(url: string | null | undefined): string | null;
export declare function extractTeamSlugFromTeamUrl(url: string | null | undefined): string | null;
//# sourceMappingURL=url.d.ts.map