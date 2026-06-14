import { cleanText } from "./text.js";
export function parseBetExplorerDateTime(raw) {
    const text = cleanText(raw);
    const parts = text.split(",").map((part) => Number(part));
    if (parts.length < 5 || parts.some((part) => !Number.isFinite(part)))
        return null;
    const [day, month, year, hour, minute] = parts;
    if (!day || !month || !year || hour === undefined || minute === undefined)
        return null;
    const pad = (value) => String(value).padStart(2, "0");
    return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00`;
}
export function parseBetExplorerTeamDate(raw) {
    const text = cleanText(raw);
    const match = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (!match)
        return null;
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year))
        return null;
    if (day < 1 || day > 31 || month < 1 || month > 12)
        return null;
    const pad = (value) => String(value).padStart(2, "0");
    return `${year}-${pad(month)}-${pad(day)}`;
}
export function nowIso() {
    return new Date().toISOString();
}
//# sourceMappingURL=date.js.map