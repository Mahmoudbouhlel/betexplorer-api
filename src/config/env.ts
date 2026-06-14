import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  BETEXPLORER_BASE_URL: z.string().url().default("https://www.betexplorer.com"),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(20_000),
  SCRAPE_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  HEADLESS: z.coerce.boolean().default(true),
  ENABLE_PLAYWRIGHT_FALLBACK: z.coerce.boolean().default(true),
  ENABLE_RESOURCE_BLOCKING: z.coerce.boolean().default(true),
  BROWSER_MAX_PAGES: z.coerce.number().int().positive().default(3),
  SCRAPER_CONCURRENCY: z.coerce.number().int().positive().default(3),
  MATCH_LIST_TTL_SECONDS: z.coerce.number().int().positive().default(120),
  MATCH_DETAILS_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  STANDINGS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  H2H_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
  TEAM_RESULTS_TTL_SECONDS: z.coerce.number().int().positive().default(1800),
  TEAM_FIXTURES_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  TEAM_PROFILE_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  ENABLE_PERFORMANCE_LOGS: z.coerce.boolean().default(true),
  MATCH_LIST_SCROLL_ENABLED: z.coerce.boolean().default(true),
  MATCH_LIST_SCROLL_MAX_ITERATIONS: z.coerce.number().int().positive().default(80),
  MATCH_LIST_SCROLL_MAX_DURATION_MS: z.coerce.number().int().positive().default(90_000),
  MATCH_LIST_SCROLL_STEP_RATIO: z.coerce.number().positive().default(0.8),
  MATCH_LIST_SCROLL_MIN_STEP_PX: z.coerce.number().int().positive().default(600),
  MATCH_LIST_SCROLL_WAIT_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
  MATCH_LIST_SCROLL_STABLE_CHECKS: z.coerce.number().int().positive().default(3),
  MATCH_LIST_SCROLL_STABLE_INTERVAL_MS: z.coerce.number().int().positive().default(250),
  MATCH_LIST_SCROLL_MAX_STAGNANT_ITERATIONS: z.coerce.number().int().positive().default(4),
  MATCH_LIST_SCROLL_BOTTOM_TOLERANCE_PX: z.coerce.number().int().nonnegative().default(80),
  MATCH_LIST_SCROLL_TOP_PAUSE_MS: z.coerce.number().int().nonnegative().default(150),
  MATCH_LIST_SCROLL_AFTER_LOAD_PAUSE_MS: z.coerce.number().int().nonnegative().default(150),
  MATCH_LIST_SHOW_MORE_MAX_CLICKS: z.coerce.number().int().nonnegative().default(20),
  MATCH_LIST_SCROLL_DEBUG: z.coerce.boolean().default(false),
});

export const env = envSchema.parse(process.env);

export type AppEnv = typeof env;
