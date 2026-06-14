import type { FastifyPluginAsync } from "fastify";
import { getPerformanceMetrics } from "../services/performance.service.js";

export const performanceRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/api/performance/metrics",
    {
      schema: {
        tags: ["Performance"],
        summary: "Performance counters and averages",
      },
    },
    async () => getPerformanceMetrics(),
  );
};
