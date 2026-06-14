import { cleanText } from "./text.js";
export function safeNumber(value) {
    if (typeof value === "number")
        return Number.isFinite(value) ? value : null;
    const normalized = cleanText(value).replace(",", ".");
    if (!normalized)
        return null;
    const match = normalized.match(/-?\d+(?:\.\d+)?/);
    if (!match)
        return null;
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
}
export function safeInteger(value) {
    const parsed = safeNumber(value);
    return parsed === null ? null : Math.trunc(parsed);
}
export function parseDecimalOdd(value) {
    const text = cleanText(value);
    if (!text || text === "-" || /suspended|closed|nan|infinity/i.test(text))
        return null;
    if (!/^\d+(?:[.,]\d+)?$/.test(text))
        return null;
    const parsed = Number(text.replace(",", "."));
    return Number.isFinite(parsed) && parsed > 1 ? parsed : null;
}
export function parseScore(value) {
    const text = cleanText(value);
    const match = text.match(/(\d+)\s*(?::|\.|-|–|—|\s)\s*(\d+)/u);
    if (!match)
        return { home: null, away: null };
    return {
        home: safeInteger(match[1]),
        away: safeInteger(match[2]),
    };
}
export function parseGoals(value) {
    const text = cleanText(value);
    const match = text.match(/(\d+)\s*:\s*(\d+)/);
    if (!match)
        return { for: null, against: null };
    return { for: safeInteger(match[1]), against: safeInteger(match[2]) };
}
//# sourceMappingURL=number.js.map