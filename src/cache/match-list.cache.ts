import type { MatchListDto, MatchSummaryDto } from "../types/index.js";
import type { CacheEntry } from "./cache-entry.js";

export const matchListCache = new Map<string, CacheEntry<MatchListDto>>();
export const matchUrlCache = new Map<string, string>();
export const matchSummaryCache = new Map<string, MatchSummaryDto>();

export function indexMatchList(data: MatchListDto): void {
  for (const match of data.matches) {
    matchUrlCache.set(match.eventId, match.eventUrl);
    matchSummaryCache.set(match.eventId, match);
  }
}

export function getKnownMatchUrl(eventId: string): string | null {
  return matchUrlCache.get(eventId) ?? null;
}

export function getKnownMatchSummary(eventId: string): MatchSummaryDto | null {
  return matchSummaryCache.get(eventId) ?? null;
}
