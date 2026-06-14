import { env } from "./config/env.js";
import { buildApp } from "./app.js";
import { shutdownBrowser } from "./clients/browser.client.js";

const app = await buildApp();

const shutdown = async () => {
  await shutdownBrowser();
  await app.close();
};

process.on("SIGINT", () => {
  void shutdown().finally(() => process.exit(0));
});

process.on("SIGTERM", () => {
  void shutdown().finally(() => process.exit(0));
});

await app.listen({ port: env.PORT, host: env.HOST });
