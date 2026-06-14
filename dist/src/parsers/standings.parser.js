import * as cheerio from "cheerio";
import { selectors } from "../constants/selectors.js";
import { parseGoals, safeInteger } from "../utils/number.js";
import { cleanText, normalizeTeamName, safeText } from "../utils/text.js";
import { absoluteBetExplorerUrl, extractTeamIdFromTeamUrl, validateEventId } from "../utils/url.js";
export function findStandingsAjaxUrl(html) {
    const $ = cheerio.load(html);
    const link = $(selectors.standings.ajaxLink).first().attr("href") ?? $(selectors.standings.submenuLink).first().attr("href") ?? null;
    return absoluteBetExplorerUrl(link);
}
export function parseStandings(html, eventId, match = null) {
    validateEventId(eventId);
    const $ = cheerio.load(html);
    const groups = parseStandingGroups($);
    const relevantGroups = match ? findRelevantGroups(groups, match) : groups;
    const homeTeamRow = match ? findTeamRow(relevantGroups, match.homeTeam.name, match.homeTeam.id) : null;
    const awayTeamRow = match ? findTeamRow(relevantGroups, match.awayTeam.name, match.awayTeam.id) : null;
    return {
        eventId,
        competition: match?.competition ?? safeText($("h1, .competition, .table-main__leaguesNames").first()),
        groups,
        homeTeamRank: homeTeamRow?.rank ?? null,
        awayTeamRank: awayTeamRow?.rank ?? null,
        homeTeamRow,
        awayTeamRow,
        scrapedAt: new Date().toISOString(),
    };
}
function parseStandingGroups($) {
    const tables = $(selectors.standings.table).toArray();
    if (tables.length === 0)
        return [];
    return tables.flatMap((table, index) => {
        const tableNode = $(table);
        const headers = tableNode.children("thead").toArray();
        if (headers.length > 0) {
            return headers.flatMap((header, headerIndex) => {
                const headerNode = $(header);
                const body = headerNode.nextAll("tbody").first();
                const rows = body.find("tr").toArray().flatMap((row) => {
                    const parsed = parseStandingRow($, $(row));
                    return parsed ? [parsed] : [];
                });
                if (rows.length === 0)
                    return [];
                return [{
                        name: safeText(headerNode.find(selectors.standings.team).first()) ?? `Group ${headerIndex + 1}`,
                        rows,
                    }];
            });
        }
        const name = safeText(tableNode.prevAll("h2,h3,.table-header,.group-title").first()) ?? (tables.length > 1 ? `Group ${index + 1}` : null);
        const rows = tableNode.find("tbody tr").toArray().flatMap((row) => {
            const parsed = parseStandingRow($, $(row));
            return parsed ? [parsed] : [];
        });
        return rows.length ? [{ name, rows }] : [];
    });
}
function parseStandingRow($, row) {
    const teamCell = row.find(selectors.standings.team).first();
    const team = safeText(teamCell);
    if (!team)
        return null;
    const goals = parseGoals(cellText(row, selectors.standings.goals));
    const teamLink = teamCell.find("a").first();
    const form = parseForm(row.find(selectors.standings.form).first());
    return {
        rank: safeInteger(cellText(row, selectors.standings.rank)),
        team,
        teamId: teamLink.attr("data-participant-id") ?? row.attr("data-participant-id") ?? extractTeamIdFromTeamUrl(absoluteBetExplorerUrl(teamLink.attr("href"))),
        teamUrl: absoluteBetExplorerUrl(teamLink.attr("href")),
        logo: absoluteBetExplorerUrl(teamCell.find("img").first().attr("src")) ?? teamCell.find("img").first().attr("src") ?? null,
        played: safeInteger(cellText(row, selectors.standings.played)),
        wins: safeInteger(cellText(row, selectors.standings.wins)),
        draws: safeInteger(cellText(row, selectors.standings.draws)),
        losses: safeInteger(cellText(row, selectors.standings.losses)),
        goalsFor: goals.for,
        goalsAgainst: goals.against,
        goalDifference: safeInteger(cellText(row, selectors.standings.goalDifference)),
        points: safeInteger(cellText(row, selectors.standings.points)),
        form,
        qualification: row.attr("title") ?? row.find("[title]").first().attr("title") ?? null,
    };
}
function cellText(row, selector) {
    return safeText(row.find(selector).first());
}
function parseForm(node) {
    const text = cleanText(node.text()).toUpperCase();
    const explicit = text.match(/[WDL]/g);
    if (explicit?.length)
        return explicit.map((value) => value);
    return node
        .find("[class*='form']")
        .toArray()
        .map((item) => {
        const className = "attribs" in item ? item.attribs?.class ?? "" : "";
        if (className.includes("-W") || className.includes("win"))
            return "W";
        if (className.includes("-D") || className.includes("draw"))
            return "D";
        if (className.includes("-L") || className.includes("loss"))
            return "L";
        return "?";
    });
}
function findRelevantGroups(groups, match) {
    const bothTeams = groups.filter((group) => hasTeam(group, match.homeTeam.name, match.homeTeam.id) &&
        hasTeam(group, match.awayTeam.name, match.awayTeam.id));
    return bothTeams.length ? bothTeams : groups;
}
function hasTeam(group, team, teamId) {
    const normalized = normalizeTeamName(team);
    return group.rows.some((row) => {
        if (teamId && row.teamId === teamId)
            return true;
        return normalizeTeamName(row.team) === normalized;
    });
}
function findTeamRow(groups, team, teamId) {
    if (teamId) {
        const byId = groups.flatMap((group) => group.rows).filter((row) => row.teamId === teamId);
        if (byId.length > 0)
            return byId[0] ?? null;
    }
    const normalized = normalizeTeamName(team);
    const exact = groups.flatMap((group) => group.rows).filter((row) => normalizeTeamName(row.team) === normalized);
    if (exact.length === 1)
        return exact[0] ?? null;
    const candidates = groups
        .flatMap((group) => group.rows)
        .map((row) => ({ row, score: similarity(normalized, normalizeTeamName(row.team)) }))
        .sort((a, b) => b.score - a.score);
    const best = candidates[0];
    const second = candidates[1];
    if (best && best.score >= 0.88 && (!second || best.score - second.score > 0.08))
        return best.row;
    return null;
}
function similarity(a, b) {
    if (!a || !b)
        return 0;
    if (a === b)
        return 1;
    const aParts = new Set(a.split(" "));
    const bParts = new Set(b.split(" "));
    const intersection = [...aParts].filter((part) => bParts.has(part)).length;
    return intersection / Math.max(aParts.size, bParts.size);
}
//# sourceMappingURL=standings.parser.js.map