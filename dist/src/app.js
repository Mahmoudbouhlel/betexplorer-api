import Fastify from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { ZodError } from "zod";
import { analysisRoutes } from "./routes/analysis.routes.js";
import { healthRoutes } from "./routes/health.routes.js";
import { matchesRoutes, sendApiError } from "./routes/matches.routes.js";
import { performanceRoutes } from "./routes/performance.routes.js";
import { standingsRoutes } from "./routes/standings.routes.js";
import { teamsRoutes } from "./routes/teams.routes.js";
export async function buildApp() {
    const app = Fastify({
        logger: true,
    });
    await app.register(cors, { origin: true });
    await app.register(swagger, {
        openapi: {
            info: {
                title: "BetExplorer API",
                description: "HTTP-first football data scraping API for BetExplorer.",
                version: "1.0.0",
            },
            tags: [
                { name: "Health" },
                { name: "Matches" },
                { name: "Details" },
                { name: "Standings" },
                { name: "H2H" },
                { name: "Recent Results" },
                { name: "Teams" },
                { name: "Analysis" },
                { name: "Performance" },
            ],
        },
    });
    await app.register(swaggerUi, { routePrefix: "/docs" });
    app.setErrorHandler((error, _request, reply) => {
        if (error instanceof ZodError) {
            return sendApiError(reply, 400, "VALIDATION_ERROR", "Request validation failed.", error.issues);
        }
        const message = error instanceof Error ? error.message : "Unexpected error";
        const code = normalizeErrorCode(message);
        const status = clientErrorCodes.has(code) || code.startsWith("INVALID") ? 400 : 502;
        return sendApiError(reply, status, code, message);
    });
    await app.register(healthRoutes);
    await app.register(analysisRoutes);
    await app.register(matchesRoutes);
    await app.register(standingsRoutes);
    await app.register(teamsRoutes);
    await app.register(performanceRoutes);
    return app;
}
const clientErrorCodes = new Set(["MATCH_URL_REQUIRED", "TEAM_URL_REQUIRED", "TEAM_TOURNAMENT_FILTER_INVALID", "TEAM_PAGE_OUT_OF_RANGE"]);
function normalizeErrorCode(message) {
    const known = [
        "INVALID_EVENT_ID",
        "INVALID_BETEXPLORER_URL",
        "INVALID_TEAM_ID",
        "INVALID_TEAM_SLUG",
        "INVALID_TEAM_URL",
        "MATCH_URL_REQUIRED",
        "MATCH_NOT_FOUND",
        "MATCH_LIST_PARSE_FAILED",
        "MATCH_DETAILS_PARSE_FAILED",
        "STANDINGS_LINK_NOT_FOUND",
        "STANDINGS_PARSE_FAILED",
        "H2H_NOT_AVAILABLE",
        "H2H_PARSE_FAILED",
        "RECENT_RESULTS_NOT_AVAILABLE",
        "RECENT_RESULTS_PARSE_FAILED",
        "TEAM_RESULTS_NOT_FOUND",
        "TEAM_RESULTS_TABLE_NOT_FOUND",
        "TEAM_RESULTS_PARSE_FAILED",
        "TEAM_FIXTURES_NOT_FOUND",
        "TEAM_FIXTURES_PARSE_FAILED",
        "TEAM_TOURNAMENT_FILTER_INVALID",
        "TEAM_PAGE_OUT_OF_RANGE",
        "TEAM_URL_REQUIRED",
        "ODDS_PARSE_FAILED",
        "BETEXPLORER_TIMEOUT",
        "BETEXPLORER_BLOCKED",
        "NO_CACHE_AVAILABLE",
    ];
    return known.find((item) => message.includes(item)) ?? "BETEXPLORER_BLOCKED";
}
//# sourceMappingURL=app.js.map