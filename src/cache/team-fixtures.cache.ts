import type { TeamFixturesDto } from "../types/index.js";
import type { CacheEntry } from "./cache-entry.js";

export const teamFixturesCache = new Map<string, CacheEntry<TeamFixturesDto>>();
