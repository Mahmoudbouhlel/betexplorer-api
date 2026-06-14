import { getTeamFixtures } from "../services/team-fixtures.service.js";
import { getTeamProfile } from "../services/team-profile.service.js";
import { getTeamResults } from "../services/team-results.service.js";
import { teamIdParamSchema, teamPageQuerySchema, teamProfileQuerySchema, teamRefreshBodySchema } from "../schemas/route.schemas.js";
import { cachedResponseSchema, errorResponseSchema } from "../schemas/match.schemas.js";
export const teamsRoutes = async (app) => {
    app.get("/api/teams/:teamId/results", routeOptions("Get team results"), async (request) => {
        const { teamId } = parseTeamParams(request);
        const query = teamPageQuerySchema.parse(request.query);
        return getTeamResults(teamId, teamPageOptions(query));
    });
    app.post("/api/teams/:teamId/results/refresh", routeOptions("Refresh team results"), async (request) => {
        const { teamId } = parseTeamParams(request);
        const body = teamRefreshBodySchema.parse(request.body);
        return getTeamResults(teamId, refreshOptions(body));
    });
    app.get("/api/teams/:teamId/fixtures", routeOptions("Get team fixtures"), async (request) => {
        const { teamId } = parseTeamParams(request);
        const query = teamPageQuerySchema.parse(request.query);
        return getTeamFixtures(teamId, teamPageOptions(query));
    });
    app.post("/api/teams/:teamId/fixtures/refresh", routeOptions("Refresh team fixtures"), async (request) => {
        const { teamId } = parseTeamParams(request);
        const body = teamRefreshBodySchema.parse(request.body);
        return getTeamFixtures(teamId, refreshOptions(body));
    });
    app.get("/api/teams/:teamId/full", routeOptions("Get combined team profile"), async (request) => {
        const { teamId } = parseTeamParams(request);
        const query = teamProfileQuerySchema.parse(request.query);
        return getTeamProfile(teamId, teamProfileOptions(query));
    });
};
function teamPageOptions(query) {
    const options = {};
    if (query.slug !== undefined)
        options.slug = query.slug;
    if (query.url !== undefined)
        options.url = query.url;
    if (query.tournamentId !== undefined)
        options.tournamentId = query.tournamentId;
    if (query.page !== undefined)
        options.page = query.page;
    if (query.limit !== undefined)
        options.limit = query.limit;
    if (query.formLimit !== undefined)
        options.formLimit = query.formLimit;
    if (query.backgroundRefresh !== undefined)
        options.backgroundRefresh = query.backgroundRefresh;
    if (query.force !== undefined)
        options.force = query.force;
    return options;
}
function refreshOptions(body) {
    const options = { force: true, backgroundRefresh: false };
    if (body.slug !== undefined)
        options.slug = body.slug;
    if (body.url !== undefined)
        options.url = body.url;
    return options;
}
function teamProfileOptions(query) {
    const options = teamPageOptions(query);
    options.includeResults = query.includeResults ?? true;
    options.includeFixtures = query.includeFixtures ?? true;
    options.resultsLimit = query.resultsLimit ?? 20;
    options.fixturesLimit = query.fixturesLimit ?? 20;
    return options;
}
function routeOptions(summary) {
    return {
        schema: {
            tags: ["Teams"],
            summary,
            querystring: {
                type: "object",
                properties: {
                    slug: { type: "string", description: "Team slug, for example netherlands." },
                    url: { type: "string", description: "Full BetExplorer team URL, for example https://www.betexplorer.com/football/team/netherlands/WYintcWb/results/." },
                    tournamentId: { type: "string", description: "Tournament filter ID, for example 389." },
                    page: { type: "integer", default: 1 },
                    limit: { type: "integer", default: 20, maximum: 100 },
                    formLimit: { type: "integer", default: 10 },
                    backgroundRefresh: { type: "boolean", default: true },
                    force: { type: "boolean", default: false },
                },
            },
            response: {
                200: cachedResponseSchema,
                400: errorResponseSchema,
                502: errorResponseSchema,
            },
        },
    };
}
function parseTeamParams(request) {
    return teamIdParamSchema.parse(request.params);
}
//# sourceMappingURL=teams.routes.js.map