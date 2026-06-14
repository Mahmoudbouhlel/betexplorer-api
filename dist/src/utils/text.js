import * as cheerio from "cheerio";
export function cleanText(value) {
    return (value ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}
export function safeText(node) {
    if (!node || node.length === 0)
        return null;
    const text = cleanText(node.first().text());
    return text.length ? text : null;
}
export function normalizeTeamName(value) {
    return cleanText(value)
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
        .trim()
        .toLowerCase();
}
export function safeArray(value) {
    return Array.isArray(value) ? value : [];
}
//# sourceMappingURL=text.js.map