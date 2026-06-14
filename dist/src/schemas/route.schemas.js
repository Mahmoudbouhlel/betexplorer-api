import { z } from "zod";
export const eventIdParamSchema = z.object({
    eventId: z.string().regex(/^[A-Za-z0-9]{6,16}$/),
});
export const teamIdParamSchema = z.object({
    teamId: z.string().regex(/^[A-Za-z0-9]{6,16}$/),
});
export const urlQuerySchema = z.object({
    url: z.string().url().optional(),
    backgroundRefresh: z.coerce.boolean().optional(),
    force: z.coerce.boolean().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    includeDetails: z.coerce.boolean().optional(),
    includeStandings: z.coerce.boolean().optional(),
    includeH2H: z.coerce.boolean().optional(),
    includeRecentResults: z.coerce.boolean().optional(),
    includeTeamResults: z.coerce.boolean().optional(),
    teamResultsLimit: z.coerce.number().int().positive().max(100).optional(),
});
export const fullRefreshBodySchema = z.object({
    url: z.string().url(),
});
export const teamPageQuerySchema = z.object({
    slug: z.string().optional(),
    url: z.string().url().optional(),
    tournamentId: z.string().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    formLimit: z.coerce.number().int().positive().optional(),
    backgroundRefresh: z.coerce.boolean().optional(),
    force: z.coerce.boolean().optional(),
});
export const teamRefreshBodySchema = z.object({
    slug: z.string().optional(),
    url: z.string().url().optional(),
});
export const teamProfileQuerySchema = teamPageQuerySchema.extend({
    includeResults: z.coerce.boolean().optional(),
    includeFixtures: z.coerce.boolean().optional(),
    resultsLimit: z.coerce.number().int().positive().max(100).optional(),
    fixturesLimit: z.coerce.number().int().positive().max(100).optional(),
});
//# sourceMappingURL=route.schemas.js.map