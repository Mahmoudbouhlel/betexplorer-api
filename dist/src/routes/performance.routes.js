import { getPerformanceMetrics } from "../services/performance.service.js";
export const performanceRoutes = async (app) => {
    app.get("/api/performance/metrics", {
        schema: {
            tags: ["Performance"],
            summary: "Performance counters and averages",
        },
    }, async () => getPerformanceMetrics());
};
//# sourceMappingURL=performance.routes.js.map