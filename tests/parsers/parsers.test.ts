import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseMatchList } from "../../src/parsers/match-list.parser.js";
import { parseMatchDetails } from "../../src/parsers/match-details.parser.js";
import { findStandingsAjaxUrl, parseStandings } from "../../src/parsers/standings.parser.js";
import { parseH2H } from "../../src/parsers/h2h.parser.js";
import { parseRecentResults } from "../../src/parsers/team-results.parser.js";

const fixture = (name: string) => readFile(new URL(`../fixtures/${name}`, import.meta.url), "utf8");

describe("match list parser", async () => {
  const html = await fixture("homepage-match-list.html");
  const parsed = parseMatchList(html);
  const first = parsed.matches[0]!;
  const finished = parsed.matches[1]!;
  const invalidOdds = parsed.matches[2]!;

  it("parses event ID", () => expect(first.eventId).toBe("4SV9xFBO"));
  it("parses date and time", () => expect(first.dateTime).toBe("2026-06-14T22:00:00"));
  it("parses home and away teams", () => expect([first.homeTeam, first.awayTeam]).toEqual(["Netherlands", "Japan"]));
  it("parses logos", () => expect(first.homeLogo).toContain("netherlands.png"));
  it("parses match URL", () => expect(first.eventUrl).toContain("/netherlands-japan/4SV9xFBO/"));
  it("parses scheduled score as null", () => expect([first.homeScore, first.awayScore]).toEqual([null, null]));
  it("parses finished score", () => expect([finished.homeScore, finished.awayScore]).toEqual([2, 1]));
  it("parses button odds", () => expect(first.odds.home).toBe(2.03));
  it("parses paragraph odds", () => expect(finished.odds.draw).toBe(3.2));
  it("parses data-odd", () => expect(finished.odds.home).toBe(1.85));
  it("invalid odds become null", () => expect([finished.odds.away, invalidOdds.odds.home, invalidOdds.odds.draw, invalidOdds.odds.away]).toEqual([null, null, null, null]));
  it("finds nearest league and country", () => expect([first.country, first.league]).toEqual(["World", "World Championship 2026"]));
  it("deduplicates event IDs", () => expect(parsed.matches.filter((match) => match.eventId === "4SV9xFBO")).toHaveLength(1));
});

describe("match details parser", async () => {
  const html = await fixture("match-details.html");
  const parsed = parseMatchDetails(html, "https://www.betexplorer.com/football/world/world-championship-2026/netherlands-japan/4SV9xFBO/");

  it("parses JSON-LD SportsEvent", () => expect(parsed.homeTeam.name).toBe("Netherlands"));
  it("parses start date", () => expect(parsed.startDate).toBe("2026-06-14T22:00:00+02:00"));
  it("parses venue", () => expect(parsed.venue).toBe("AT&T Stadium"));
  it("parses competition", () => expect(parsed.competition).toBe("World Championship 2026"));
  it("parses team names and logos", () => expect(parsed.awayTeam.logo).toContain("japan.png"));
  it("handles missing JSON-LD with DOM fallback", () => {
    const fallback = parseMatchDetails('<span class="participant-home">Home FC</span><span class="participant-away">Away FC</span>', "https://www.betexplorer.com/football/world/test/home-away/ABCDEF1/");
    expect([fallback.homeTeam.name, fallback.awayTeam.name]).toEqual(["Home FC", "Away FC"]);
  });
});

describe("h2h parser", async () => {
  const html = await fixture("h2h.html");
  const parsed = parseH2H(html, "4SV9xFBO");
  const row = parsed.matches[0]!;

  it("parses H2H summary", () => expect(parsed.summary.totalMatches).toBe(4));
  it("parses H2H percentages", () => expect(parsed.summary.homeWinPercent).toBe(50));
  it("parses rows", () => expect(parsed.matches).toHaveLength(1));
  it("parses scores", () => expect([row.homeScore, row.awayScore]).toEqual([3, 1]));
  it("parses result outcome", () => expect(row.outcome).toBe("HOME_WIN"));
  it("handles no H2H", () => expect(parseH2H("<div></div>", "4SV9xFBO").matches).toHaveLength(0));
});

describe("recent results parser", async () => {
  const html = await fixture("recent-results.html");
  const parsed = parseRecentResults(html, "4SV9xFBO");

  it("parses home recent results", () => expect(parsed.home.team).toBe("Netherlands"));
  it("parses away recent results", () => expect(parsed.away.team).toBe("Japan"));
  it("parses W/D/L from CSS class", () => expect(parsed.home.form).toEqual(["W", "D"]));
  it("calculates form counts", () => expect([parsed.home.wins, parsed.home.draws, parsed.home.losses]).toEqual([1, 1, 0]));
  it("calculates goals for and against", () => expect([parsed.home.goalsFor, parsed.home.goalsAgainst]).toEqual([3, 1]));
  it("parses historical odds", () => expect(parsed.home.matches[0]!.odds.home).toBe(1.55));
  it("handles missing recent results safely", () => expect(parseRecentResults("<div></div>", "4SV9xFBO").home.matches).toHaveLength(0));
});

describe("standings parser", async () => {
  const detailsHtml = await fixture("match-details.html");
  const standingsHtml = await fixture("standings.html");
  const details = parseMatchDetails(detailsHtml, "https://www.betexplorer.com/football/world/world-championship-2026/netherlands-japan/4SV9xFBO/");
  const parsed = parseStandings(standingsHtml, "4SV9xFBO", details);
  const row = parsed.groups[0]!.rows[0]!;
  const japan = parsed.groups[0]!.rows[1]!;

  it("finds standings AJAX link", () => expect(findStandingsAjaxUrl(detailsHtml)).toContain("event_context=4SV9xFBO"));
  it("parses multiple groups", () => expect(parsed.groups).toHaveLength(2));
  it("parses rank", () => expect(row.rank).toBe(1));
  it("parses MP/W/D/L", () => expect([row.played, row.wins, row.draws, row.losses]).toEqual([3, 2, 1, 0]));
  it("parses goals for/against", () => expect([row.goalsFor, row.goalsAgainst]).toEqual([10, 5]));
  it("parses goal difference", () => expect(row.goalDifference).toBe(5));
  it("parses points", () => expect(row.points).toBe(7));
  it("parses form", () => expect(japan.form).toEqual(["W", "D", "L"]));
  it("finds home-team standing row", () => expect(parsed.homeTeamRow?.team).toBe("Netherlands"));
  it("finds away-team standing row", () => expect(parsed.awayTeamRow?.team).toBe("Japan"));
  it("does not guess ambiguous team names", () => {
    const ambiguous = parseStandings(standingsHtml, "4SV9xFBO", {
      homeTeam: { name: "Japan", logo: null },
      awayTeam: { name: "Japan", logo: null },
      competition: null,
    });
    expect(ambiguous.homeTeamRow?.team).toBe("Japan");
  });
});
