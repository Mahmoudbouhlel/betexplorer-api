import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

type CheerioNode = cheerio.Cheerio<AnyNode>;

export function cleanText(value: string | null | undefined): string {
  return (value ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

export function safeText(node: CheerioNode | null | undefined): string | null {
  if (!node || node.length === 0) return null;
  const text = cleanText(node.first().text());
  return text.length ? text : null;
}

export function normalizeTeamName(value: string | null | undefined): string {
  return cleanText(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
    .toLowerCase();
}

export function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}
