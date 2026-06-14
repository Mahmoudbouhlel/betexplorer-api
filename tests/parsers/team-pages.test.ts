import { readFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { teamFixturesCache } from "../../src/cache/team-fixtures.cache.js";
import { fullMatchCache } from "../../src/cache/full-match.cache.js";
import { matchTeamsCache, teamProfileCache } from "../../src/cache/team-profile.cache.js";
import { teamPageResultsCache } from "../../src/cache/team-results.cache.js";
import { setCacheEntry } from "../../src/cache/cache-entry.js";
import {
  applyTeamResultsView,
  calculateTeamResultsSummary,
  parseBetExplorerTeamScore,
  parseTeamResultsPage,
  parseTeamResultsSource,
  sourceToResults,
} from "../../src/parsers/team-results.parser.js";
import { parseTeamFixturesPage } from "../../src/parsers/team-fixtures.parser.js";
import {
  buildTeamFixturesUrl,
  buildTeamResultsUrl,
  extractTeamIdFromTeamUrl,
  parseTeamReferenceFromUrl,
} from "../../src/utils/url.js";

const mocks = vi.hoisted(() => ({
  fetchSourceHtml: vi.fn<(url: string) => Promise<string>>(),
}));

vi.mock("../../src/services/source.service.js", () => ({
  fetchSourceHtml: mocks.fetchSourceHtml,
}));

const fixture = (name: string) => readFile(new URL(`../fixtures/${name}`, import.meta.url), "utf8");
const reference = parseTeamReferenceFromUrl("https://www.betexplorer.com/football/team/netherlands/WYintcWb/results/");

describe("team page parser", async () => {
  const html = await fixture("team-results-netherlands.html");
  const parsed = parseTeamResultsPage(html, reference);
  const source = sourceToResults(parseTeamResultsSource(html, reference));

  it("parses team ID from URL", () => expect(reference.teamId).toBe("WYintcWb"));
  it("parses team slug from URL", () => expect(reference.slug).toBe("netherlands"));
  it("builds canonical results URL", () => expect(buildTeamResultsUrl("netherlands", "WYintcWb")).toBe(reference.resultsUrl));
  it("builds canonical fixtures URL", () => expect(buildTeamFixturesUrl("netherlands", "WYintcWb")).toContain("/fixtures/"));
  it("parses team name from breadcrumb", () => expect(parsed.team.name).toBe("Netherlands"));
  it("parses available tournament filters", () => expect(parsed.filters.availableTournaments.map((filter) => filter.id)).toEqual(["389", "124"]));
  it("parses tournament header", () => expect(parsed.tournaments[0]?.tournament.competition).toBe("Friendly International"));
  it("parses tournament country", () => expect(parsed.tournaments[0]?.tournament.country).toBe("World"));
  it("parses tournament stage", () => expect(parsed.tournaments[0]?.tournament.stage).toBe("Main"));
  it("carries tournament context into result rows", () => expect(parsed.matches[1]?.tournament.tournamentId).toBe("389"));
  it("parses home team", () => expect(parsed.matches[0]?.homeTeam.name).toBe("Netherlands"));
  it("parses away team", () => expect(parsed.matches[0]?.awayTeam.name).toBe("Uzbekistan"));
  it("detects selected team as home", () => expect(parsed.matches[0]?.selectedTeamPosition).toBe("HOME"));
  it("detects selected team as away", () => expect(parsed.matches[1]?.selectedTeamPosition).toBe("AWAY"));
  it("detects selected team by team ID fallback", () => expect(parsed.matches[5]?.selectedTeamPosition).toBe("AWAY"));
  it("parses W from icon__w", () => expect(parsed.matches[0]?.selectedTeamResult).toBe("W"));
  it("parses D from icon__d", () => expect(parsed.matches[1]?.selectedTeamResult).toBe("D"));
  it("parses L from icon__l", () => expect(parsed.matches[2]?.selectedTeamResult).toBe("L"));
  it("falls back to score-derived form", () => {
    const withoutIcon = parseTeamResultsPage(html.replace("icon icon__w", "icon"), reference);
    expect(withoutIcon.matches[0]?.selectedTeamResult).toBe("W");
  });
  it("parses simple score", () => expect(parseBetExplorerTeamScore("2:1")).toMatchObject({ home: 2, away: 1 }));
  it("parses half-time and second-half score", () =>
    expect(parseBetExplorerTeamScore("2:1 (1:0, 1:1)")).toMatchObject({ halfTimeHome: 1, halfTimeAway: 0, secondHalfHome: 1, secondHalfAway: 1 }));
  it("parses match event ID", () => expect(parsed.matches[0]?.eventId).toBe("Eo8XRPwQ"));
  it("parses opponent team ID", () => expect(parsed.matches[0]?.awayTeam.teamId).toBe("EZYKKRMc"));
  it("extracts team ID from team URL", () => expect(extractTeamIdFromTeamUrl("/football/team/uzbekistan/EZYKKRMc/")).toBe("EZYKKRMc"));
  it("parses details URL", () => expect(parsed.matches[2]?.eventUrl).toContain("/germany-netherlands/GeNe2026/"));
  it("parses date", () => expect(parsed.matches[0]?.date).toBe("2026-06-08"));
  it("parses 1X2 odds", () => expect(parsed.matches[0]?.odds).toEqual({ home: 1.5, draw: 4, away: 6 }));
  it("calculates goals for from selected-team perspective", () => expect(parsed.summary.goalsFor).toBe(9));
  it("calculates goals against from selected-team perspective", () => expect(parsed.summary.goalsAgainst).toBe(5));
  it("calculates clean sheets", () => expect(parsed.summary.cleanSheets).toBe(3));
  it("calculates BTTS", () => expect(parsed.summary.bothTeamsScored).toBe(2));
  it("calculates Over 1.5", () => expect(parsed.summary.over15).toBe(5));
  it("calculates Over 2.5", () => expect(parsed.summary.over25).toBe(3));
  it("calculates Under 2.5", () => expect(parsed.summary.under25).toBe(3));
  it("calculates win rate", () => expect(parsed.summary.winRate).toBe(50));
  it("does not divide by zero", () => {
    const summary = calculateTeamResultsSummary([]);
    expect([summary.winRate, summary.averageGoalsFor]).toEqual([null, null]);
  });
  it("filters by tournament ID", () => {
    const filtered = applyTeamResultsView(source, { tournamentId: "389" });
    expect(filtered.matches).toHaveLength(2);
  });
  it("paginates correctly", () => {
    const page = applyTeamResultsView(source, { page: 2, limit: 2 });
    expect([page.pagination.totalItems, page.pagination.totalPages, page.matches[0]?.eventId]).toEqual([6, 3, "GeNe2026"]);
  });
  it("rejects invalid team URL", () => {
    expect(() => parseTeamReferenceFromUrl("https://example.com/football/team/netherlands/WYintcWb/results/")).toThrow("INVALID_TEAM_URL");
  });
  it("missing table produces parser error", () => {
    expect(() => parseTeamResultsPage("<html><body><h1>Results & Fixtures</h1><p>Matches are listed below.</p></body></html>", reference)).toThrow(
      "TEAM_RESULTS_TABLE_NOT_FOUND",
    );
  });
  it("legitimate no-results state returns empty matches safely", () => {
    const empty = parseTeamResultsPage("<html><body><h1>Results & Fixtures</h1><p>No matches found.</p></body></html>", reference);
    expect(empty.matches).toHaveLength(0);
  });
  it("parses fixtures as scheduled without selected results", () => {
    const fixtures = parseTeamFixturesPage(html, reference);
    expect([fixtures.matches[0]?.status, fixtures.matches[0]?.selectedTeamResult]).toEqual(["SCHEDULED", "UNKNOWN"]);
  });
});

describe("team page services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    teamPageResultsCache.clear();
    teamFixturesCache.clear();
    teamProfileCache.clear();
    matchTeamsCache.clear();
    fullMatchCache.clear();
  });

  it("team-results cache hit avoids HTTP fetch", async () => {
    const { getTeamResults } = await import("../../src/services/team-results.service.js");
    const html = await fixture("team-results-netherlands.html");
    mocks.fetchSourceHtml.mockResolvedValueOnce(html);
    await getTeamResults("WYintcWb", { slug: "netherlands", force: true });
    mocks.fetchSourceHtml.mockClear();
    const response = await getTeamResults("WYintcWb", { slug: "netherlands" });
    expect(response.cache.fromCache).toBe(true);
    expect(mocks.fetchSourceHtml).not.toHaveBeenCalled();
  });

  it("duplicate team-results requests reuse one Promise", async () => {
    const { refreshTeamResults } = await import("../../src/services/team-results.service.js");
    const html = await fixture("team-results-netherlands.html");
    mocks.fetchSourceHtml.mockResolvedValue(html);
    const [first, second] = await Promise.all([
      refreshTeamResults("WYintcWb", { slug: "netherlands" }),
      refreshTeamResults("WYintcWb", { slug: "netherlands" }),
    ]);
    expect(first.matches.length).toBe(second.matches.length);
    expect(mocks.fetchSourceHtml).toHaveBeenCalledTimes(1);
  });

  it("refresh failure preserves team-results cache", async () => {
    const { getTeamResults } = await import("../../src/services/team-results.service.js");
    const html = await fixture("team-results-netherlands.html");
    setCacheEntry(teamPageResultsCache, "results:WYintcWb", sourceToResults(parseTeamResultsSource(html, reference)));
    mocks.fetchSourceHtml.mockRejectedValueOnce(new Error("BETEXPLORER_TIMEOUT"));
    const response = await getTeamResults("WYintcWb", { slug: "netherlands", force: true });
    expect(response.data.team.name).toBe("Netherlands");
    expect(response.warnings[0]).toContain("BETEXPLORER_TIMEOUT");
  });

  it("results and fixtures caches remain separate", async () => {
    const { getTeamResults } = await import("../../src/services/team-results.service.js");
    const { getTeamFixtures } = await import("../../src/services/team-fixtures.service.js");
    const html = await fixture("team-results-netherlands.html");
    mocks.fetchSourceHtml.mockResolvedValue(html);
    await getTeamResults("WYintcWb", { slug: "netherlands", force: true });
    await getTeamFixtures("WYintcWb", { slug: "netherlands", force: true });
    expect(teamPageResultsCache.has("results:WYintcWb")).toBe(true);
    expect(teamFixturesCache.has("fixtures:WYintcWb")).toBe(true);
  });

  it("does not import Playwright in the team-results service", async () => {
    const source = await readFile(new URL("../../src/services/team-results.service.ts", import.meta.url), "utf8");
    expect(source).not.toContain("withPage");
  });

  it("full match team-results integration tolerates one team failure", async () => {
    const { refreshFullMatch } = await import("../../src/services/full-match.service.js");
    const html = await fixture("team-results-netherlands.html");
    mocks.fetchSourceHtml.mockImplementation(async (url) => {
      if (url.includes("netherlands-japan")) return matchWithTeamLinks();
      if (url.includes("/team/netherlands/")) return html;
      if (url.includes("/team/japan/")) throw new Error("TEAM_RESULTS_PARSE_FAILED");
      return html;
    });
    const response = await refreshFullMatch("4SV9xFBO", "https://www.betexplorer.com/football/world/world-championship-2026/netherlands-japan/4SV9xFBO/", {
      includeDetails: false,
      includeStandings: false,
      includeH2H: false,
      includeRecentResults: false,
      includeTeamResults: true,
      teamResultsLimit: 2,
    });
    expect(response.teamResults?.home?.team.name).toBe("Netherlands");
    expect(response.teamResults?.away).toBeNull();
    expect(response.warnings[0]).toContain("TEAM_RESULTS_PARSE_FAILED");
  });

  it("TypeScript source contains no unsafe any in team API files", async () => {
    const files = await Promise.all([
      readFile(new URL("../../src/types/team.types.ts", import.meta.url), "utf8"),
      readFile(new URL("../../src/parsers/team-results.parser.ts", import.meta.url), "utf8"),
      readFile(new URL("../../src/services/team-results.service.ts", import.meta.url), "utf8"),
    ]);
    expect(files.join("\n")).not.toMatch(/\bas any\b/);
  });
});

function matchWithTeamLinks(): string {
  return `
    <html>
      <head>
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "SportsEvent",
            "name": "Netherlands - Japan",
            "homeTeam": { "name": "Netherlands" },
            "awayTeam": { "name": "Japan" }
          }
        </script>
      </head>
      <body>
        <a href="/football/team/netherlands/WYintcWb/">Netherlands</a>
        <a href="/football/team/japan/ULXPdOUj/">Japan</a>
      </body>
    </html>
  `;
}
