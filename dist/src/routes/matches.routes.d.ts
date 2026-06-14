import type { FastifyPluginAsync, FastifyReply } from "fastify";
export declare const matchesRoutes: FastifyPluginAsync;
export declare function sendApiError(reply: FastifyReply, status: number, code: string, message: string, details?: unknown): FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("node:http").IncomingMessage, import("node:http").ServerResponse<import("node:http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
//# sourceMappingURL=matches.routes.d.ts.map