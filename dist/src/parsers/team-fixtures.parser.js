import { applyTeamFixturesView, parseTeamFixturesSource, } from "./team-results.parser.js";
export { parseTeamFixturesSource } from "./team-results.parser.js";
export function parseTeamFixturesPage(html, reference) {
    return sourceToFixtures(parseTeamFixturesSource(html, reference));
}
export function sourceToFixtures(source) {
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
export function applyTeamFixturesPageView(source, options) {
    return applyTeamFixturesView(source, options);
}
//# sourceMappingURL=team-fixtures.parser.js.map