import { getMatchStandings } from "../services/standings.service.js";
import { eventIdParamSchema, urlQuerySchema } from "../schemas/route.schemas.js";
export const standingsRoutes = async (app) => {
    app.get("/api/standings/:eventId", {
        schema: {
            tags: ["Standings"],
            summary: "Alias endpoint for match standings",
        },
    }, async (request) => {
        const { eventId } = eventIdParamSchema.parse(request.params);
        const query = urlQuerySchema.parse(request.query);
        return getMatchStandings(eventId, query.url ? { url: query.url, backgroundRefresh: query.backgroundRefresh ?? true, force: query.force ?? false } : { backgroundRefresh: query.backgroundRefresh ?? true, force: query.force ?? false });
    });
};
//# sourceMappingURL=standings.routes.js.map