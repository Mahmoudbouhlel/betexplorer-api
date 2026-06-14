import type { FastifyPluginAsync } from "fastify";
import { getBrowserStats } from "../clients/browser.client.js";
import { h2hCache } from "../cache/h2h.cache.js";
import { matchDetailsCache } from "../cache/match-details.cache.js";
import { matchListCache } from "../cache/match-list.cache.js";
import { standingsCache } from "../cache/standings.cache.js";
import { teamResultsCache } from "../cache/team-results.cache.js";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/health",
    {
      schema: {
        tags: ["Health"],
        summary: "Service health and cache state",
      },
    },
    async () => ({
      status: "OK",
      source: "BetExplorer",
      browser: getBrowserStats(),
      cache: {
        matchLists: matchListCache.size,
        details: matchDetailsCache.size,
        standings: standingsCache.size,
        h2h: h2hCache.size,
        recentResults: teamResultsCache.size,
      },
    }),
  );
};
