export declare const errorResponseSchema: {
    readonly type: "object";
    readonly properties: {
        readonly error: {
            readonly type: "object";
            readonly properties: {
                readonly code: {
                    readonly type: "string";
                };
                readonly message: {
                    readonly type: "string";
                };
                readonly details: {};
            };
            readonly required: readonly ["code", "message"];
        };
    };
    readonly required: readonly ["error"];
};
export declare const cacheMetadataSchema: {
    readonly type: "object";
    readonly properties: {
        readonly fromCache: {
            readonly type: "boolean";
        };
        readonly stale: {
            readonly type: "boolean";
        };
        readonly refreshing: {
            readonly type: "boolean";
        };
        readonly updatedAt: {
            readonly type: readonly ["string", "null"];
        };
        readonly ageSeconds: {
            readonly type: readonly ["number", "null"];
        };
    };
};
export declare const cachedResponseSchema: {
    readonly type: "object";
    readonly properties: {
        readonly data: {};
        readonly cache: {
            readonly type: "object";
            readonly properties: {
                readonly fromCache: {
                    readonly type: "boolean";
                };
                readonly stale: {
                    readonly type: "boolean";
                };
                readonly refreshing: {
                    readonly type: "boolean";
                };
                readonly updatedAt: {
                    readonly type: readonly ["string", "null"];
                };
                readonly ageSeconds: {
                    readonly type: readonly ["number", "null"];
                };
            };
        };
        readonly warnings: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
            };
        };
    };
};
//# sourceMappingURL=match.schemas.d.ts.map