import { readFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { matchListCache, matchSummaryCache, matchUrlCache } from "../../src/cache/match-list.cache.js";
import { matchDetailsCache } from "../../src/cache/match-details.cache.js";
import { h2hCache } from "../../src/cache/h2h.cache.js";
import { standingsCache } from "../../src/cache/standings.cache.js";
import { teamResultsCache } from "../../src/cache/team-results.cache.js";
import { fullMatchCache } from "../../src/cache/full-match.cache.js";
import { setCacheEntry } from "../../src/cache/cache-entry.js";
import { validateBetExplorerUrl } from "../../src/utils/url.js";
import type { MatchDetailsDto } from "../../src/types/index.js";

const mocks = vi.hoisted(() => ({
  fetchSourceHtml: vi.fn<(url: string) => Promise<string>>(),
}));

vi.mock("../../src/services/source.service.js", () => ({
  fetchSourceHtml: mocks.fetchSourceHtml,
}));

const fixture = (name: string) => readFile(new URL(`../fixtures/${name}`, import.meta.url), "utf8");

describe("service cache and request behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    matchListCache.clear();
    matchUrlCache.clear();
    matchSummaryCache.clear();
    matchDetailsCache.clear();
    h2hCache.clear();
    standingsCache.clear();
    teamResultsCache.clear();
    fullMatchCache.clear();
  });

  it("cache hit avoids source request", async () => {
    const { getMatchList } = await import("../../src/services/match-list.service.js");
    const html = await fixture("homepage-match-list.html");
    mocks.fetchSourceHtml.mockResolvedValueOnce(html);
    await getMatchList({ force: true });
    mocks.fetchSourceHtml.mockClear();
    const cached = await getMatchList();
    expect(cached.cache.fromCache).toBe(true);
    expect(mocks.fetchSourceHtml).not.toHaveBeenCalled();
  });

  it("duplicate requests reuse one Promise", async () => {
    const { refreshMatchList } = await import("../../src/services/match-list.service.js");
    const html = await fixture("homepage-match-list.html");
    mocks.fetchSourceHtml.mockResolvedValue(html);
    const [a, b] = await Promise.all([refreshMatchList(), refreshMatchList()]);
    expect(a.count).toBe(b.count);
    expect(mocks.fetchSourceHtml).toHaveBeenCalledTimes(1);
  });

  it("refresh failure preserves cache", async () => {
    const { getMatchDetails } = await import("../../src/services/match-details.service.js");
    const cached = detailsDto();
    setCacheEntry(matchDetailsCache, "4SV9xFBO", cached);
    mocks.fetchSourceHtml.mockRejectedValueOnce(new Error("BETEXPLORER_TIMEOUT"));
    const response = await getMatchDetails("4SV9xFBO", {
      url: "https://www.betexplorer.com/football/world/world-championship-2026/netherlands-japan/4SV9xFBO/",
      force: true,
    });
    expect(response.data.homeTeam.name).toBe("Netherlands");
    expect(response.warnings[0]).toContain("BETEXPLORER_TIMEOUT");
  });

  it("full refresh tolerates partial section failure", async () => {
    const { refreshFullMatch } = await import("../../src/services/full-match.service.js");
    const detailsHtml = await fixture("match-details.html");
    const h2hHtml = await fixture("h2h.html");
    const recentHtml = await fixture("recent-results.html");
    mocks.fetchSourceHtml.mockImplementation(async (url) => {
      if (url.includes("standings")) throw new Error("STANDINGS_PARSE_FAILED");
      if (url.includes("netherlands-japan")) return detailsHtml;
      if (url.includes("h2h")) return h2hHtml;
      return recentHtml;
    });
    const response = await refreshFullMatch("4SV9xFBO", "https://www.betexplorer.com/football/world/world-championship-2026/netherlands-japan/4SV9xFBO/");
    expect(response.details?.homeTeam.name).toBe("Netherlands");
    expect(response.warnings.length).toBeGreaterThan(0);
  });

  it("browser launches only once in client implementation", async () => {
    const source = await readFile(new URL("../../src/clients/browser.client.ts", import.meta.url), "utf8");
    expect(source.match(/chromium\.launch/g)).toHaveLength(1);
  });

  it("HTTP is preferred over Playwright", async () => {
    const source = await readFile(new URL("../../src/services/source.service.ts", import.meta.url), "utf8");
    expect(source.indexOf("fetchHtml")).toBeLessThan(source.indexOf("fetchWithBrowser"));
  });

  it("invalid external URL is rejected", () => {
    expect(() => validateBetExplorerUrl("https://example.com/football/world/test/a-b/ABC1234/")).toThrow("INVALID_BETEXPLORER_URL");
  });
});

function detailsDto(): MatchDetailsDto {
  return {
    eventId: "4SV9xFBO",
    url: "https://www.betexplorer.com/football/world/world-championship-2026/netherlands-japan/4SV9xFBO/",
    sport: "football",
    homeTeam: { name: "Netherlands", logo: null },
    awayTeam: { name: "Japan", logo: null },
    competition: "World Championship 2026",
    country: "world",
    startDate: "2026-06-14T22:00:00+02:00",
    status: "SCHEDULED",
    venue: "AT&T Stadium",
    locality: "Arlington",
    homeScore: null,
    awayScore: null,
    odds: null,
    scrapedAt: new Date().toISOString(),
  };
}
