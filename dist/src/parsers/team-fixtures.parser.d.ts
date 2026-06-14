import type { BetExplorerTeamReference, TeamFixturesDto } from "../types/index.js";
import { type TeamPageSource, type TeamPageViewOptions } from "./team-results.parser.js";
export { parseTeamFixturesSource } from "./team-results.parser.js";
export declare function parseTeamFixturesPage(html: string, reference: BetExplorerTeamReference): TeamFixturesDto;
export declare function sourceToFixtures(source: TeamPageSource): TeamFixturesDto;
export declare function applyTeamFixturesPageView(source: TeamFixturesDto, options: TeamPageViewOptions): TeamFixturesDto;
//# sourceMappingURL=team-fixtures.parser.d.ts.map