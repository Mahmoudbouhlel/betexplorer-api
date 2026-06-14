import type { BetExplorerTeamReference, TeamFixturesDto } from "../types/index.js";
import {
  applyTeamFixturesView,
  parseTeamFixturesSource,
  type TeamPageSource,
  type TeamPageViewOptions,
} from "./team-results.parser.js";

export { parseTeamFixturesSource } from "./team-results.parser.js";

export function parseTeamFixturesPage(html: string, reference: BetExplorerTeamReference): TeamFixturesDto {
  return sourceToFixtures(parseTeamFixturesSource(html, reference));
}

export function sourceToFixtures(source: TeamPageSource): TeamFixturesDto {
  const totalItems = source.matches.length;
  return {
    team: source.team,
    matches: source.matches,
    pagination: {
      page: 1,
      limit: totalItems === 0 ? 20 : Math.min(totalItems, 100),
      totalItems,
      totalPages: totalItems === 0 ? 0 : 1,
      hasPrevious: false,
      hasNext: false,
    },
    scrapedAt: source.scrapedAt,
  };
}

export function applyTeamFixturesPageView(source: TeamFixturesDto, options: TeamPageViewOptions): TeamFixturesDto {
  return applyTeamFixturesView(source, options);
}
