import { z } from "zod";
export declare const eventIdParamSchema: z.ZodObject<{
    eventId: z.ZodString;
}, z.core.$strip>;
export declare const teamIdParamSchema: z.ZodObject<{
    teamId: z.ZodString;
}, z.core.$strip>;
export declare const urlQuerySchema: z.ZodObject<{
    url: z.ZodOptional<z.ZodString>;
    backgroundRefresh: z.ZodOptional<z.ZodCoercedBoolean<unknown>>;
    force: z.ZodOptional<z.ZodCoercedBoolean<unknown>>;
    limit: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    includeDetails: z.ZodOptional<z.ZodCoercedBoolean<unknown>>;
    includeStandings: z.ZodOptional<z.ZodCoercedBoolean<unknown>>;
    includeH2H: z.ZodOptional<z.ZodCoercedBoolean<unknown>>;
    includeRecentResults: z.ZodOptional<z.ZodCoercedBoolean<unknown>>;
    includeTeamResults: z.ZodOptional<z.ZodCoercedBoolean<unknown>>;
    teamResultsLimit: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export declare const fullRefreshBodySchema: z.ZodObject<{
    url: z.ZodString;
}, z.core.$strip>;
export declare const teamPageQuerySchema: z.ZodObject<{
    slug: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    tournamentId: z.ZodOptional<z.ZodString>;
    page: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    formLimit: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    backgroundRefresh: z.ZodOptional<z.ZodCoercedBoolean<unknown>>;
    force: z.ZodOptional<z.ZodCoercedBoolean<unknown>>;
}, z.core.$strip>;
export declare const teamRefreshBodySchema: z.ZodObject<{
    slug: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const teamProfileQuerySchema: z.ZodObject<{
    slug: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    tournamentId: z.ZodOptional<z.ZodString>;
    page: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    formLimit: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    backgroundRefresh: z.ZodOptional<z.ZodCoercedBoolean<unknown>>;
    force: z.ZodOptional<z.ZodCoercedBoolean<unknown>>;
    includeResults: z.ZodOptional<z.ZodCoercedBoolean<unknown>>;
    includeFixtures: z.ZodOptional<z.ZodCoercedBoolean<unknown>>;
    resultsLimit: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    fixturesLimit: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
//# sourceMappingURL=route.schemas.d.ts.map