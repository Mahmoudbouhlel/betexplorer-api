import type { MatchStandingsDto } from "../types/index.js";
import type { CacheEntry } from "./cache-entry.js";

export const standingsCache = new Map<string, CacheEntry<MatchStandingsDto>>();
