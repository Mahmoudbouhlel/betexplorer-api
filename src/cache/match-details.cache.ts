import type { MatchDetailsDto } from "../types/index.js";
import type { CacheEntry } from "./cache-entry.js";

export const matchDetailsCache = new Map<string, CacheEntry<MatchDetailsDto>>();
