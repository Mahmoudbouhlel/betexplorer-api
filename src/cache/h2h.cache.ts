import type { MatchH2HDto } from "../types/index.js";
import type { CacheEntry } from "./cache-entry.js";

export const h2hCache = new Map<string, CacheEntry<MatchH2HDto>>();
