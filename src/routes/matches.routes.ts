import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { getKnownMatchSummary } from "../cache/match-list.cache.js";
import { getMatchList, refreshMatchList } from "../services/match-list.service.js";
import { getMatchDetails } from "../services/match-details.service.js";
import { getMatchH2H } from "../services/h2h.service.js";
import { getRecentResults } from "../services/team-results.service.js";
import { getMatchStandings } from "../services/standings.service.js";
import { getFullMatch, refreshFullMatch } from "../services/full-match.service.js";
import { getMatchTeams } from "../services/team-profile.service.js";
import { getMatchAnalysis } from "../services/analysis.service.js";
import { getPerformanceMetrics } from "../services/performance.service.js";
import { eventIdParamSchema, fullRefreshBodySchema, urlQuerySchema } from "../schemas/route.schemas.js";
import { cachedResponseSchema, errorResponseSchema } from "../schemas/match.schemas.js";

type RouteQuery = {
  url?: string;
  refresh?: string | boolean;
  backgroundRefresh?: string | boolean;
  force?: string | boolean;
  limit?: string | number;
  includeDetails?: string | boolean;
  includeStandings?: string | boolean;
  includeH2H?: string | boolean;
  includeRecentResults?: string | boolean;
  includeTeamResults?: string | boolean;
  teamResultsLimit?: string | number;
};

export const matchesRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/api/matches",
    {
      schema: {
        tags: ["Matches"],
        summary: "Get homepage football match list",
        response: { 200: cachedResponseSchema, 502: errorResponseSchema },
      },
    },
    async (request) => {
      const query = request.query as RouteQuery;
      return getMatchList({
        force: bool(query.refresh),
        backgroundRefresh: bool(query.backgroundRefresh),
      });
    },
  );

  app.post(
    "/api/matches/refresh",
    {
      schema: { tags: ["Matches"], summary: "Force refresh homepage match list" },
    },
    async () => {
      const data = await refreshMatchList();
      return { data, warnings: [] };
    },
  );

  app.get(
    "/api/matches/refresh-status",
    {
      schema: { tags: ["Matches"], summary: "Get latest homepage refresh status" },
    },
    async () => {
      const metrics = getPerformanceMetrics();
      return {
        data: {
          matchList: metrics.matchList,
          browser: metrics.browser,
        },
        warnings: [],
      };
    },
  );

  app.get(
    "/api/matches/:eventId",
    {
      schema: { tags: ["Matches"], summary: "Get cached match summary by event ID", response: { 404: errorResponseSchema } },
    },
    async (request, reply) => {
      const { eventId } = parseEventParams(request);
      const summary = getKnownMatchSummary(eventId);
      if (!summary) return reply.code(404).send(apiError("MATCH_NOT_FOUND", "Match summary is not cached."));
      return summary;
    },
  );

  app.get("/api/matches/:eventId/details", routeOptions("Details", "Get match details"), async (request) => {
    const { eventId } = parseEventParams(request);
    const query = parseUrlQuery(request);
    return getMatchDetails(eventId, withOptionalUrl(query, {
      backgroundRefresh: query.backgroundRefresh ?? true,
      force: query.force ?? false,
    }));
  });

  app.post("/api/matches/:eventId/details/refresh", routeOptions("Details", "Refresh match details"), async (request) => {
    const { eventId } = parseEventParams(request);
    const query = parseUrlQuery(request);
    return getMatchDetails(eventId, withOptionalUrl(query, { force: true, backgroundRefresh: false }));
  });

  app.post("/api/matches/:eventId/refresh", routeOptions("Matches", "Refresh all match detail sections"), async (request) => {
    const { eventId } = parseEventParams(request);
    const query = parseUrlQuery(request);
    const data = await refreshFullMatch(eventId, query.url);
    return { data, warnings: data.warnings };
  });

  app.get("/api/matches/:eventId/odds", routeOptions("Odds", "Get match 1X2 odds"), async (request) => {
    const { eventId } = parseEventParams(request);
    const query = parseUrlQuery(request);
    const details = await getMatchDetails(eventId, withOptionalUrl(query, {
      backgroundRefresh: query.backgroundRefresh ?? true,
      force: query.force ?? false,
    }));
    return {
      data: {
        eventId,
        best: details.data.odds,
        reference: details.data.referenceOdds ?? null,
        bookmakers: details.data.bookmakerOdds ?? [],
        scrapedAt: details.data.scrapedAt,
      },
      cache: details.cache,
      warnings: details.warnings,
    };
  });

  app.get("/api/matches/:eventId/analysis", routeOptions("Analysis", "Get match analysis"), async (request) => {
    const { eventId } = parseEventParams(request);
    const query = parseUrlQuery(request);
    return getMatchAnalysis(eventId, withOptionalUrl(query, {}));
  });

  app.get("/api/matches/:eventId/h2h", routeOptions("H2H", "Get head-to-head matches"), async (request) => {
    const { eventId } = parseEventParams(request);
    const query = parseUrlQuery(request);
    return getMatchH2H(eventId, withOptionalUrl(query, { backgroundRefresh: query.backgroundRefresh ?? true, force: query.force ?? false }));
  });

  app.post("/api/matches/:eventId/h2h/refresh", routeOptions("H2H", "Refresh head-to-head matches"), async (request) => {
    const { eventId } = parseEventParams(request);
    const query = parseUrlQuery(request);
    return getMatchH2H(eventId, withOptionalUrl(query, { force: true, backgroundRefresh: false }));
  });

  app.get("/api/matches/:eventId/recent-results", routeOptions("Recent Results", "Get recent results for both teams"), async (request) => {
    const { eventId } = parseEventParams(request);
    const query = parseUrlQuery(request);
    return getRecentResults(eventId, withOptionalUrl(query, {
      ...(query.limit === undefined ? {} : { limit: query.limit }),
      backgroundRefresh: query.backgroundRefresh ?? true,
      force: query.force ?? false,
    }));
  });

  app.post("/api/matches/:eventId/recent-results/refresh", routeOptions("Recent Results", "Refresh recent team results"), async (request) => {
    const { eventId } = parseEventParams(request);
    const query = parseUrlQuery(request);
    return getRecentResults(eventId, withOptionalUrl(query, { force: true, backgroundRefresh: false }));
  });

  app.get("/api/matches/:eventId/teams", routeOptions("Teams", "Get team references for a match"), async (request) => {
    const { eventId } = parseEventParams(request);
    const query = parseUrlQuery(request);
    return getMatchTeams(eventId, withOptionalUrl(query, {
      backgroundRefresh: query.backgroundRefresh ?? true,
      force: query.force ?? false,
    }));
  });

  app.get("/api/matches/:eventId/standings", routeOptions("Standings", "Get match standings"), async (request) => {
    const { eventId } = parseEventParams(request);
    const query = parseUrlQuery(request);
    return getMatchStandings(eventId, withOptionalUrl(query, { backgroundRefresh: query.backgroundRefresh ?? true, force: query.force ?? false }));
  });

  app.post("/api/matches/:eventId/standings/refresh", routeOptions("Standings", "Refresh match standings"), async (request) => {
    const { eventId } = parseEventParams(request);
    const query = parseUrlQuery(request);
    return getMatchStandings(eventId, withOptionalUrl(query, { force: true, backgroundRefresh: false }));
  });

  app.get("/api/matches/:eventId/full", routeOptions("Matches", "Get combined full match response"), async (request) => {
    const { eventId } = parseEventParams(request);
    const query = parseUrlQuery(request);
    return getFullMatch(eventId, withOptionalUrl(query, {
      backgroundRefresh: query.backgroundRefresh ?? true,
      includeDetails: query.includeDetails ?? true,
      includeStandings: query.includeStandings ?? true,
      includeH2H: query.includeH2H ?? true,
      includeRecentResults: query.includeRecentResults ?? true,
      includeTeamResults: query.includeTeamResults ?? false,
      teamResultsLimit: query.teamResultsLimit ?? 10,
    }));
  });

  app.post("/api/matches/:eventId/full/refresh", routeOptions("Matches", "Refresh all full-match sections"), async (request) => {
    const { eventId } = parseEventParams(request);
    const body = fullRefreshBodySchema.parse(request.body);
    const data = await refreshFullMatch(eventId, body.url);
    return { data, warnings: data.warnings };
  });
};

function routeOptions(tag: string, summary: string) {
  return {
    schema: {
      tags: [tag],
      summary,
      response: { 200: cachedResponseSchema, 400: errorResponseSchema, 502: errorResponseSchema },
    },
  };
}

function parseEventParams(request: FastifyRequest): { eventId: string } {
  return eventIdParamSchema.parse(request.params);
}

function parseUrlQuery(request: FastifyRequest) {
  return urlQuerySchema.parse(request.query);
}

function bool(value: string | boolean | undefined): boolean {
  if (typeof value === "boolean") return value;
  return value === "true";
}

function withOptionalUrl<T extends object>(query: { url?: string | undefined }, options: T): T & { url?: string } {
  return query.url ? { ...options, url: query.url } : options;
}

function apiError(code: string, message: string) {
  return { error: { code, message } };
}

export function sendApiError(reply: FastifyReply, status: number, code: string, message: string, details?: unknown) {
  return reply.code(status).send({ error: { code, message, details } });
}
