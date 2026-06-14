import type { MatchRecentResultsDto, TeamResultsDto } from "../types/index.js";
import type { CacheEntry } from "./cache-entry.js";

export const teamResultsCache = new Map<string, CacheEntry<MatchRecentResultsDto>>();
export const teamPageResultsCache = new Map<string, CacheEntry<TeamResultsDto>>();
