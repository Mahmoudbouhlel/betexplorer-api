import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { QUICK_ANALYSIS_BATCH_SIZE, getQuickMatchAnalyses } from "../services/quick-analysis.service.js";

const quickAnalysisBodySchema = z.object({
  eventIds: z.array(z.string().min(1)).min(1).max(QUICK_ANALYSIS_BATCH_SIZE),
});

export const analysisRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/api/analysis/quick",
    {
      schema: {
        tags: ["Analysis"],
        summary: "Get lightweight batch match-card analysis",
      },
    },
    async (request) => {
      const body = quickAnalysisBodySchema.parse(request.body);
      const data = await getQuickMatchAnalyses(body.eventIds);
      return { data, warnings: [] };
    },
  );
};
