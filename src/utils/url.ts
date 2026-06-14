import { env } from "../config/env.js";
import type { BetExplorerTeamReference } from "../types/index.js";

const EVENT_ID_PATTERN = /^[A-Za-z0-9]{6,16}$/;
const TEAM_ID_PATTERN = /^[A-Za-z0-9]{6,16}$/;
const TEAM_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateEventId(eventId: string): string {
  if (!EVENT_ID_PATTERN.test(eventId)) {
    throw new Error("INVALID_EVENT_ID");
  }
  return eventId;
}

export function validateTeamId(teamId: string): string {
  if (!TEAM_ID_PATTERN.test(teamId)) {
    throw new Error("INVALID_TEAM_ID");
  }
  return teamId;
}

export function validateTeamSlug(slug: string): string {
  if (!TEAM_SLUG_PATTERN.test(slug)) {
    throw new Error("INVALID_TEAM_SLUG");
  }
  return slug;
}

export function validateBetExplorerUrl(url: string): URL {
  let parsed: URL;
  try {
    if (url.startsWith("//")) throw new Error("Protocol-relative URLs are not supported.");
    parsed = new URL(url);
  } catch {
    throw new Error("INVALID_BETEXPLORER_URL");
  }

  if (parsed.protocol !== "https:" || parsed.hostname !== "www.betexplorer.com") {
    throw new Error("INVALID_BETEXPLORER_URL");
  }
  if (parsed.username || parsed.password) {
    throw new Error("INVALID_BETEXPLORER_URL");
  }
  if (!parsed.pathname.startsWith("/")) {
    throw new Error("INVALID_BETEXPLORER_URL");
  }
  return parsed;
}

export function parseTeamReferenceFromUrl(url: string): BetExplorerTeamReference {
  let parsed: URL;
  try {
    parsed = validateTeamUrl(url);
  } catch (error) {
    if (error instanceof Error && (error.message === "INVALID_TEAM_ID" || error.message === "INVALID_TEAM_SLUG")) throw error;
    throw new Error("INVALID_TEAM_URL", { cause: error });
  }
  const segments = parsed.pathname.split("/").filter(Boolean);
  const slug = segments[2] ?? "";
  const teamId = segments[3] ?? "";
  return buildTeamReference(slug, teamId);
}

export function buildTeamResultsUrl(slug: string, teamId: string): string {
  return `${buildTeamReference(slug, teamId).baseUrl}results/`;
}

export function buildTeamFixturesUrl(slug: string, teamId: string): string {
  return `${buildTeamReference(slug, teamId).baseUrl}fixtures/`;
}

export function buildTeamReference(slug: string, teamId: string): BetExplorerTeamReference {
  const validSlug = validateTeamSlug(slug);
  const validTeamId = validateTeamId(teamId);
  const baseUrl = new URL(`/football/team/${validSlug}/${validTeamId}/`, env.BETEXPLORER_BASE_URL).toString();
  return {
    slug: validSlug,
    teamId: validTeamId,
    baseUrl,
    resultsUrl: `${baseUrl}results/`,
    fixturesUrl: `${baseUrl}fixtures/`,
  };
}

export function absoluteBetExplorerUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = value.startsWith("http") ? validateBetExplorerUrl(value) : validateBetExplorerUrl(new URL(value, env.BETEXPLORER_BASE_URL).toString());
    return parsed.toString();
  } catch {
    return null;
  }
}

export function relativeBetExplorerUrl(value: string | null | undefined): string | null {
  const absolute = absoluteBetExplorerUrl(value);
  if (!absolute) return null;
  const parsed = new URL(absolute);
  return `${parsed.pathname}${parsed.search}`;
}

export function extractEventIdFromUrl(url: string | null | undefined): string | null {
  const absolute = absoluteBetExplorerUrl(url);
  if (!absolute) return null;
  const segments = new URL(absolute).pathname.split("/").filter(Boolean);
  const candidate = segments.at(-1) ?? null;
  return candidate && EVENT_ID_PATTERN.test(candidate) ? candidate : null;
}

export function extractTeamIdFromTeamUrl(url: string | null | undefined): string | null {
  const absolute = absoluteBetExplorerUrl(url);
  if (!absolute) return null;
  const segments = new URL(absolute).pathname.split("/").filter(Boolean);
  if (segments.length < 4 || segments[0] !== "football" || segments[1] !== "team") return null;
  const candidate = segments[3] ?? null;
  return candidate && TEAM_ID_PATTERN.test(candidate) ? candidate : null;
}

export function extractTeamSlugFromTeamUrl(url: string | null | undefined): string | null {
  const absolute = absoluteBetExplorerUrl(url);
  if (!absolute) return null;
  const segments = new URL(absolute).pathname.split("/").filter(Boolean);
  if (segments.length < 4 || segments[0] !== "football" || segments[1] !== "team") return null;
  const candidate = segments[2] ?? null;
  return candidate && TEAM_SLUG_PATTERN.test(candidate) ? candidate : null;
}

function validateTeamUrl(url: string): URL {
  const parsed = validateBetExplorerUrl(url);
  if (parsed.search || parsed.hash) {
    throw new Error("INVALID_TEAM_URL");
  }
  const segments = parsed.pathname.split("/").filter(Boolean);
  const section = segments[4] ?? null;
  const hasValidSection = section === null || section === "results" || section === "fixtures";
  if (
    segments.length < 4 ||
    segments.length > 5 ||
    segments[0] !== "football" ||
    segments[1] !== "team" ||
    !hasValidSection
  ) {
    throw new Error("INVALID_TEAM_URL");
  }
  try {
    validateTeamSlug(segments[2] ?? "");
    validateTeamId(segments[3] ?? "");
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_TEAM_ID") throw error;
    if (error instanceof Error && error.message === "INVALID_TEAM_SLUG") throw error;
    throw new Error("INVALID_TEAM_URL", { cause: error });
  }
  return parsed;
}
