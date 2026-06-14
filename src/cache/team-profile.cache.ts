import type { MatchTeamsDto, TeamProfileDto } from "../types/index.js";
import type { CacheEntry } from "./cache-entry.js";

export const teamProfileCache = new Map<string, CacheEntry<TeamProfileDto>>();
export const matchTeamsCache = new Map<string, CacheEntry<MatchTeamsDto>>();
