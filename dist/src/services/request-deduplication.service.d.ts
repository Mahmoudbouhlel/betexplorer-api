export declare const activeMatchLists: Map<string, Promise<unknown>>;
export declare const activeDetails: Map<string, Promise<unknown>>;
export declare const activeStandings: Map<string, Promise<unknown>>;
export declare const activeH2H: Map<string, Promise<unknown>>;
export declare const activeRecentResults: Map<string, Promise<unknown>>;
export declare const activeFullMatches: Map<string, Promise<unknown>>;
export declare const activeTeamResults: Map<string, Promise<unknown>>;
export declare const activeTeamFixtures: Map<string, Promise<unknown>>;
export declare const activeTeamProfiles: Map<string, Promise<unknown>>;
export declare const activeMatchTeams: Map<string, Promise<unknown>>;
export declare function dedupe<T>(map: Map<string, Promise<unknown>>, key: string, factory: () => Promise<T>): Promise<T>;
//# sourceMappingURL=request-deduplication.service.d.ts.map