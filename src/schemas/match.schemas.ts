export const errorResponseSchema = {
  type: "object",
  properties: {
    error: {
      type: "object",
      properties: {
        code: { type: "string" },
        message: { type: "string" },
        details: {},
      },
      required: ["code", "message"],
    },
  },
  required: ["error"],
} as const;

export const cacheMetadataSchema = {
  type: "object",
  properties: {
    fromCache: { type: "boolean" },
    stale: { type: "boolean" },
    refreshing: { type: "boolean" },
    updatedAt: { type: ["string", "null"] },
    ageSeconds: { type: ["number", "null"] },
  },
} as const;

export const cachedResponseSchema = {
  type: "object",
  properties: {
    data: {},
    cache: cacheMetadataSchema,
    warnings: { type: "array", items: { type: "string" } },
  },
} as const;
