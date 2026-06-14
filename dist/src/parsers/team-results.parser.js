import * as cheerio from "cheerio";
import { selectors } from "../constants/selectors.js";
import { parseBetExplorerTeamDate } from "../utils/date.js";
import { parseDecimalOdd, parseScore } from "../utils/number.js";
import { cleanText, normalizeTeamName, safeText } from "../utils/text.js";
import { absoluteBetExplorerUrl, extractEventIdFromUrl, extractTeamIdFromTeamUrl, validateEventId, } from "../utils/url.js";
import { parseHistoricalRow } from "./h2h.parser.js";
const emptyTournament = {
    tournamentId: null,
    seasonId: null,
    country: null,
    competition: null,
    stage: null,
    tournamentUrl: null,
};
export function parseRecentResults(html, eventId) {
    validateEventId(eventId);
    const $ = cheerio.load(html);
    const homeSection = $(selectors.recentResults.homeResults).first();
    const awaySection = $(selectors.recentResults.awayResults).first();
    const fallbackHome = safeText($("ul.list-details a[href*='/football/team/']").eq(0));
    const fallbackAway = safeText($("ul.list-details a[href*='/football/team/']").eq(1));
    const scrapedAt = new Date().toISOString();
    return {
        eventId,
        home: parseTeamSection($, homeSection, scrapedAt, fallbackHome),
        away: parseTeamSection($, awaySection, scrapedAt, fallbackAway),
        scrapedAt,
    };
}
export function parseTeamResultsPage(html, reference) {
    const source = parseTeamPageSource(html, reference, "results");
    return applyTeamResultsView(sourceToResults(source), {});
}
export function parseTeamFixturesSource(html, reference) {
    return parseTeamPageSource(html, reference, "fixtures");
}
export function parseTeamResultsSource(html, reference) {
    return parseTeamPageSource(html, reference, "results");
}
export function applyTeamResultsView(source, options) {
    const tournamentId = normalizedTournamentFilter(source, options.tournamentId ?? null);
    const filteredMatches = tournamentId ? source.matches.filter((match) => match.tournament.tournamentId === tournamentId) : source.matches;
    const pagination = paginate(filteredMatches, options.page, options.limit);
    const pagedMatches = filteredMatches.slice((pagination.page - 1) * pagination.limit, pagination.page * pagination.limit);
    return {
        ...source,
        filters: {
            selectedTournamentId: tournamentId,
            availableTournaments: source.filters.availableTournaments,
        },
        tournaments: groupByTournament(pagedMatches),
        matches: pagedMatches,
        summary: calculateTeamResultsSummary(filteredMatches, options.formLimit),
        pagination,
    };
}
export function applyTeamFixturesView(source, options) {
    const tournamentId = normalizedFixturesTournamentFilter(source.filters?.availableTournaments ?? [], options.tournamentId ?? null);
    const filteredMatches = tournamentId ? source.matches.filter((match) => match.tournament.tournamentId === tournamentId) : source.matches;
    const pagination = paginate(filteredMatches, options.page, options.limit);
    const pagedMatches = filteredMatches.slice((pagination.page - 1) * pagination.limit, pagination.page * pagination.limit);
    return {
        team: source.team,
        matches: pagedMatches,
        pagination,
        scrapedAt: source.scrapedAt,
    };
}
export function sourceToResults(source) {
    return {
        team: source.team,
        filters: source.filters,
        tournaments: groupByTournament(source.matches),
        matches: source.matches,
        summary: calculateTeamResultsSummary(source.matches),
        pagination: paginate(source.matches),
        scrapedAt: source.scrapedAt,
    };
}
export function parseBetExplorerTeamScore(raw) {
    const text = cleanText(raw);
    const pairs = Array.from(text.matchAll(/(\d+)\s*:\s*(\d+)/g));
    const fullTime = scorePair(pairs[0]);
    const halfTime = scorePair(pairs[1]);
    const secondHalf = scorePair(pairs[2]);
    return {
        home: fullTime.home,
        away: fullTime.away,
        halfTimeHome: halfTime.home,
        halfTimeAway: halfTime.away,
        secondHalfHome: secondHalf.home,
        secondHalfAway: secondHalf.away,
        raw: text || raw,
    };
}
export function calculateTeamResultsSummary(matches, formLimit = 10) {
    const allowedFormLimit = normalizeFormLimit(formLimit);
    const finished = matches.filter((match) => isSummarizable(match));
    const seed = {
        totalMatches: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        cleanSheets: 0,
        failedToScore: 0,
        bothTeamsScored: 0,
        over15: 0,
        over25: 0,
        under25: 0,
        homeMatches: 0,
        awayMatches: 0,
        homeWins: 0,
        awayWins: 0,
    };
    const totals = finished.reduce((acc, match) => {
        const perspective = selectedPerspectiveScore(match);
        if (!perspective)
            return acc;
        acc.totalMatches += 1;
        acc.goalsFor += perspective.forGoals;
        acc.goalsAgainst += perspective.againstGoals;
        if (perspective.forGoals > perspective.againstGoals)
            acc.wins += 1;
        if (perspective.forGoals === perspective.againstGoals)
            acc.draws += 1;
        if (perspective.forGoals < perspective.againstGoals)
            acc.losses += 1;
        if (perspective.againstGoals === 0)
            acc.cleanSheets += 1;
        if (perspective.forGoals === 0)
            acc.failedToScore += 1;
        if (perspective.forGoals > 0 && perspective.againstGoals > 0)
            acc.bothTeamsScored += 1;
        const totalGoals = perspective.forGoals + perspective.againstGoals;
        if (totalGoals > 1.5)
            acc.over15 += 1;
        if (totalGoals > 2.5)
            acc.over25 += 1;
        if (totalGoals < 2.5)
            acc.under25 += 1;
        if (match.selectedTeamPosition === "HOME") {
            acc.homeMatches += 1;
            if (perspective.forGoals > perspective.againstGoals)
                acc.homeWins += 1;
        }
        if (match.selectedTeamPosition === "AWAY") {
            acc.awayMatches += 1;
            if (perspective.forGoals > perspective.againstGoals)
                acc.awayWins += 1;
        }
        return acc;
    }, seed);
    const total = totals.totalMatches;
    const form = finished
        .map((match) => match.selectedTeamResult)
        .filter((result) => result !== "UNKNOWN")
        .slice(0, allowedFormLimit);
    return {
        ...totals,
        goalDifference: totals.goalsFor - totals.goalsAgainst,
        form,
        winRate: rate(totals.wins, total),
        drawRate: rate(totals.draws, total),
        lossRate: rate(totals.losses, total),
        averageGoalsFor: averageValue(totals.goalsFor, total),
        averageGoalsAgainst: averageValue(totals.goalsAgainst, total),
        averageTotalGoals: averageValue(totals.goalsFor + totals.goalsAgainst, total),
    };
}
function parseTeamPageSource(html, reference, mode) {
    const $ = cheerio.load(html);
    const table = $(selectors.teamPage.table).first();
    if (!table.length) {
        if (isLegitimateNoMatchesPage($)) {
            return {
                team: parseTeamIdentity($, reference),
                filters: {
                    selectedTournamentId: null,
                    availableTournaments: parseTournamentFilters($),
                },
                matches: [],
                scrapedAt: new Date().toISOString(),
            };
        }
        throw new Error(mode === "results" ? "TEAM_RESULTS_TABLE_NOT_FOUND" : "TEAM_FIXTURES_PARSE_FAILED");
    }
    const team = parseTeamIdentity($, reference);
    let currentTournament = emptyTournament;
    const matches = [];
    table.find("tbody > tr").each((_index, element) => {
        const row = $(element);
        if (row.attr("data-tsid") !== undefined) {
            currentTournament = parseTournamentRow($, row);
            return;
        }
        if (row.attr("data-ttid") !== undefined) {
            const match = parseTeamMatchRow($, row, currentTournament, team, mode);
            if (match)
                matches.push(match);
        }
    });
    if (matches.length === 0 && hasMatchLikeRows(table) && hasResultsLanguage($, mode)) {
        throw new Error(mode === "results" ? "TEAM_RESULTS_PARSE_FAILED" : "TEAM_FIXTURES_PARSE_FAILED");
    }
    return {
        team,
        filters: {
            selectedTournamentId: null,
            availableTournaments: parseTournamentFilters($),
        },
        matches,
        scrapedAt: new Date().toISOString(),
    };
}
function parseTeamIdentity($, reference) {
    const fromBreadcrumb = extractTeamNameFromBreadcrumb($, reference);
    const fromMeta = extractTeamNameFromMeta($);
    const fromStrong = safeText($(selectors.teamPage.table).find("strong").first());
    const name = fromBreadcrumb ?? fromMeta ?? fromStrong ?? titleCaseSlug(reference.slug);
    return {
        teamId: reference.teamId,
        slug: reference.slug,
        name,
        summaryUrl: reference.baseUrl,
        resultsUrl: reference.resultsUrl,
        fixturesUrl: reference.fixturesUrl,
        logo: absoluteBetExplorerUrl($('meta[property="og:image"]').attr("content")) ?? absoluteBetExplorerUrl($(".team-logo img, .logo img").first().attr("src")),
    };
}
function extractTeamNameFromBreadcrumb($, reference) {
    const records = extractJsonLdRecords($);
    for (const record of records) {
        if (stringValue(record["@type"]) !== "BreadcrumbList")
            continue;
        const items = arrayValue(record.itemListElement).map(recordValue).filter(isRecord);
        const exact = items.find((item) => {
            const itemRecord = recordValue(item.item);
            const itemUrl = stringValue(item.item) ?? stringValue(itemRecord?.["@id"]) ?? stringValue(itemRecord?.url);
            return Boolean(itemUrl && itemUrl.includes(`/football/team/${reference.slug}/${reference.teamId}/`));
        });
        const exactName = stringValue(exact?.name);
        if (exactName && !/results|fixtures|summary/i.test(exactName))
            return exactName;
        const fallback = items
            .map((item) => stringValue(item.name))
            .filter((value) => Boolean(value && !/results|fixtures|summary|football/i.test(value)))
            .at(-1);
        if (fallback)
            return fallback;
    }
    return null;
}
function extractJsonLdRecords($) {
    const records = [];
    $('script[type="application/ld+json"]').each((_index, element) => {
        const raw = cleanText($(element).text());
        if (!raw)
            return;
        try {
            collectJsonRecords(JSON.parse(raw), records);
        }
        catch {
            return;
        }
    });
    return records;
}
function collectJsonRecords(value, records) {
    if (Array.isArray(value)) {
        value.forEach((item) => collectJsonRecords(item, records));
        return;
    }
    const record = recordValue(value);
    if (!record)
        return;
    records.push(record);
    collectJsonRecords(record["@graph"], records);
}
function extractTeamNameFromMeta($) {
    const candidates = [
        $('meta[property="og:title"]').attr("content"),
        $("title").first().text(),
        $('meta[name="description"]').attr("content"),
        $(selectors.teamPage.title).first().text(),
    ];
    for (const candidate of candidates) {
        const cleaned = cleanText(candidate)
            .replace(/\s*\|\s*BetExplorer.*$/i, "")
            .replace(/\s*-\s*BetExplorer.*$/i, "")
            .replace(/\b(results|fixtures|summary)\b/gi, "")
            .replace(/\s+/g, " ")
            .trim();
        if (cleaned && /\p{Letter}/u.test(cleaned) && !/^football$/i.test(cleaned))
            return cleaned;
    }
    return null;
}
function parseTournamentFilters($) {
    return $(selectors.teamPage.filter)
        .first()
        .find("option")
        .toArray()
        .map((option) => ({
        id: cleanText($(option).attr("value")),
        label: cleanText($(option).text()),
    }))
        .filter((option) => option.id.length > 0 && option.id !== "0" && option.label.length > 0);
}
function parseTournamentRow($, row) {
    const link = row.find(selectors.teamPage.tournamentLink).first();
    const label = safeText(link) ?? safeText(row.find("th").first()) ?? "";
    const countryFromImage = cleanText(link.find("img").first().attr("alt"));
    const parsedLabel = parseTournamentLabel(label);
    return {
        tournamentId: cleanText(row.attr("data-ttid")) || null,
        seasonId: cleanText(row.attr("data-tsid")) || null,
        country: countryFromImage || parsedLabel.country,
        competition: parsedLabel.competition,
        stage: parsedLabel.stage,
        tournamentUrl: absoluteBetExplorerUrl(link.attr("href")),
    };
}
function parseTournamentLabel(label) {
    const cleaned = cleanText(label);
    if (!cleaned)
        return { country: null, competition: null, stage: null };
    const colonIndex = cleaned.indexOf(":");
    const country = colonIndex >= 0 ? cleaned.slice(0, colonIndex).trim() : null;
    const remaining = colonIndex >= 0 ? cleaned.slice(colonIndex + 1).trim() : cleaned;
    const stageMarker = " - ";
    const stageIndex = remaining.lastIndexOf(stageMarker);
    if (stageIndex >= 0) {
        return {
            country,
            competition: cleanText(remaining.slice(0, stageIndex)) || null,
            stage: cleanText(remaining.slice(stageIndex + stageMarker.length)) || null,
        };
    }
    return {
        country,
        competition: remaining || null,
        stage: null,
    };
}
function parseTeamMatchRow($, row, currentTournament, team, mode) {
    const cells = row.find("td").toArray().map((cell) => $(cell));
    const scoreCell = findScoreCell(cells);
    const teamCells = cells.filter((cell) => isTeamCell(cell, scoreCell));
    const homeTeam = parseTeamCell(teamCells[0]);
    const awayTeam = parseTeamCell(teamCells[1]);
    if (!homeTeam.name || !awayTeam.name)
        return null;
    const scoreRaw = scoreCell ? safeText(scoreCell) : null;
    const score = scoreRaw ? parseBetExplorerTeamScore(scoreRaw) : emptyScore(scoreRaw);
    const position = selectedTeamPosition(team, homeTeam, awayTeam, teamCells[0], teamCells[1]);
    const status = inferStatus(scoreRaw, score, mode);
    const iconResult = position === "UNKNOWN" ? "UNKNOWN" : parseFormIcon(row);
    const selectedResult = mode === "fixtures" ? "UNKNOWN" : iconResult === "UNKNOWN" ? deriveResultFromScore(position, score) : iconResult;
    const eventUrl = findDetailsUrl(row);
    return {
        eventId: extractEventIdFromUrl(eventUrl),
        eventUrl,
        date: parseBetExplorerTeamDate(safeText(row.find(selectors.teamPage.dateCell).first())),
        dateTime: null,
        tournament: tournamentFromRow(row, currentTournament),
        homeTeam,
        awayTeam,
        selectedTeamPosition: position,
        selectedTeamResult: selectedResult,
        score,
        odds: parseTeamOdds(row),
        status,
    };
}
function tournamentFromRow(row, currentTournament) {
    const rowTournamentId = cleanText(row.attr("data-ttid"));
    if (!rowTournamentId || rowTournamentId === currentTournament.tournamentId)
        return currentTournament;
    return {
        ...currentTournament,
        tournamentId: rowTournamentId,
    };
}
function findScoreCell(cells) {
    const byColspan = cells.find((cell) => {
        const text = cleanText(cell.text());
        return cell.attr("colspan") === "3" && Boolean(text);
    });
    if (byColspan)
        return byColspan;
    return (cells.find((cell) => {
        const text = cleanText(cell.text());
        return /(?:\d+\s*:\s*\d+|awarded|postponed|cancelled|canceled)/i.test(text);
    }) ?? null);
}
function isTeamCell(cell, scoreCell) {
    if (scoreCell && sameNode(cell, scoreCell))
        return false;
    if (cell.is(".table-main__formicon") || cell.find(selectors.teamPage.formIcon).length > 0)
        return false;
    if (cell.is(selectors.teamPage.dateCell))
        return false;
    if (findDetailsUrl(cell))
        return false;
    const text = cleanText(cell.text());
    if (!text || /^details$/i.test(text))
        return false;
    if (cell.find('a[href*="/football/team/"]').length > 0)
        return true;
    if (cell.find("strong").length > 0)
        return true;
    return /\p{Letter}/u.test(text);
}
function sameNode(left, right) {
    const leftNode = left.get(0);
    const rightNode = right.get(0);
    return Boolean(leftNode && rightNode && leftNode === rightNode);
}
function parseTeamCell(cell) {
    if (!cell)
        return { name: "", teamId: null, teamUrl: null };
    const teamLink = cell.find('a[href*="/football/team/"]').first();
    const teamUrl = absoluteBetExplorerUrl(teamLink.attr("href"));
    return {
        name: safeText(cell.find("strong").first()) ?? safeText(teamLink) ?? safeText(cell) ?? "",
        teamId: extractTeamIdFromTeamUrl(teamUrl),
        teamUrl,
    };
}
function selectedTeamPosition(team, homeTeam, awayTeam, homeCell, awayCell) {
    if (homeCell?.find("strong").length)
        return "HOME";
    if (awayCell?.find("strong").length)
        return "AWAY";
    const normalizedSelected = normalizeTeamName(team.name);
    if (normalizeTeamName(homeTeam.name) === normalizedSelected)
        return "HOME";
    if (normalizeTeamName(awayTeam.name) === normalizedSelected)
        return "AWAY";
    if (homeTeam.teamId === team.teamId)
        return "HOME";
    if (awayTeam.teamId === team.teamId)
        return "AWAY";
    return "UNKNOWN";
}
function parseFormIcon(row) {
    const className = row.find(selectors.teamPage.formIcon).first().attr("class") ?? "";
    if (/\bicon__w\b/i.test(className))
        return "W";
    if (/\bicon__d\b/i.test(className))
        return "D";
    if (/\bicon__l\b/i.test(className))
        return "L";
    return "UNKNOWN";
}
function deriveResultFromScore(position, score) {
    if (position === "UNKNOWN" || score.home === null || score.away === null)
        return "UNKNOWN";
    const goalsFor = position === "HOME" ? score.home : score.away;
    const goalsAgainst = position === "HOME" ? score.away : score.home;
    if (goalsFor > goalsAgainst)
        return "W";
    if (goalsFor < goalsAgainst)
        return "L";
    return "D";
}
function inferStatus(raw, score, mode) {
    const text = cleanText(raw).toLowerCase();
    if (/postponed|postp|pstp/.test(text))
        return "POSTPONED";
    if (/cancelled|canceled|aband/.test(text))
        return "CANCELLED";
    if (mode === "fixtures")
        return "SCHEDULED";
    if (score.home !== null && score.away !== null)
        return "FINISHED";
    if (/^\d{1,2}:\d{2}$/.test(text))
        return "SCHEDULED";
    return "UNKNOWN";
}
function parseTeamOdds(row) {
    const odds = row.find(".table-main__odd, .table-main__odds[data-oid], .odds-nowrp");
    const values = [0, 1, 2].map((index) => {
        const node = odds.eq(index);
        if (!node.length)
            return null;
        return parseDecimalOdd(node.attr("data-odd")) ?? parseDecimalOdd(node.find("button").first().text()) ?? parseDecimalOdd(node.text());
    });
    return {
        home: values[0] ?? null,
        draw: values[1] ?? null,
        away: values[2] ?? null,
    };
}
function findDetailsUrl(scope) {
    const anchors = scope.find(selectors.teamPage.detailsLink).toArray();
    for (const anchor of anchors) {
        const node = scope.find(anchor);
        const text = cleanText(node.text()).toLowerCase();
        const href = absoluteBetExplorerUrl(node.attr("href"));
        if (!href)
            continue;
        if (text === "details")
            return href;
        if (isFootballMatchEventUrl(href))
            return href;
    }
    return null;
}
function isFootballMatchEventUrl(url) {
    const absolute = absoluteBetExplorerUrl(url);
    if (!absolute)
        return false;
    const parsed = new URL(absolute);
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length < 5)
        return false;
    if (segments[0] !== "football")
        return false;
    if (segments[1] === "team")
        return false;
    return extractEventIdFromUrl(absolute) !== null;
}
function emptyScore(raw) {
    return {
        home: null,
        away: null,
        halfTimeHome: null,
        halfTimeAway: null,
        secondHalfHome: null,
        secondHalfAway: null,
        raw,
    };
}
function scorePair(match) {
    if (!match)
        return { home: null, away: null };
    const home = Number(match[1]);
    const away = Number(match[2]);
    return {
        home: Number.isInteger(home) ? home : null,
        away: Number.isInteger(away) ? away : null,
    };
}
function groupByTournament(matches) {
    const groups = new Map();
    for (const match of matches) {
        const key = [
            match.tournament.tournamentId,
            match.tournament.seasonId,
            match.tournament.tournamentUrl,
            match.tournament.competition,
            match.tournament.stage,
        ]
            .map((value) => value ?? "")
            .join("|");
        const existing = groups.get(key);
        if (existing) {
            existing.matches.push(match);
        }
        else {
            groups.set(key, { tournament: match.tournament, matches: [match] });
        }
    }
    return Array.from(groups.values());
}
function paginate(matches, page = 1, limit = 20) {
    const normalizedPage = Number.isInteger(page) && page > 0 ? page : 1;
    const normalizedLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;
    const totalItems = matches.length;
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / normalizedLimit);
    if (totalPages > 0 && normalizedPage > totalPages) {
        throw new Error("TEAM_PAGE_OUT_OF_RANGE");
    }
    return {
        page: normalizedPage,
        limit: normalizedLimit,
        totalItems,
        totalPages,
        hasPrevious: normalizedPage > 1 && totalPages > 0,
        hasNext: totalPages > 0 && normalizedPage < totalPages,
    };
}
function normalizedTournamentFilter(source, tournamentId) {
    if (!tournamentId)
        return null;
    const availableIds = new Set(source.filters.availableTournaments.map((filter) => filter.id));
    const matchHasTournament = source.matches.some((match) => match.tournament.tournamentId === tournamentId);
    if (!availableIds.has(tournamentId) && !matchHasTournament)
        throw new Error("TEAM_TOURNAMENT_FILTER_INVALID");
    return tournamentId;
}
function normalizedFixturesTournamentFilter(filters, tournamentId) {
    if (!tournamentId)
        return null;
    if (filters.length > 0 && !filters.some((filter) => filter.id === tournamentId)) {
        throw new Error("TEAM_TOURNAMENT_FILTER_INVALID");
    }
    return tournamentId;
}
function normalizeFormLimit(value) {
    const allowed = new Set([5, 10, 15, 20, 50]);
    return allowed.has(value) ? value : 10;
}
function isSummarizable(match) {
    return match.status === "FINISHED" && selectedPerspectiveScore(match) !== null;
}
function selectedPerspectiveScore(match) {
    if (match.score.home === null || match.score.away === null)
        return null;
    if (match.selectedTeamPosition === "HOME")
        return { forGoals: match.score.home, againstGoals: match.score.away };
    if (match.selectedTeamPosition === "AWAY")
        return { forGoals: match.score.away, againstGoals: match.score.home };
    return null;
}
function rate(value, total) {
    if (total === 0)
        return null;
    return round((value / total) * 100);
}
function averageValue(value, total) {
    if (total === 0)
        return null;
    return round(value / total);
}
function round(value) {
    return Math.round(value * 100) / 100;
}
function isLegitimateNoMatchesPage($) {
    const pageText = cleanText($.root().text()).toLowerCase();
    return /no\s+(matches|results|fixtures)|there are no|no data/.test(pageText);
}
function hasResultsLanguage($, mode) {
    const title = cleanText($(selectors.teamPage.title).first().text()).toLowerCase();
    if (mode === "fixtures")
        return /fixtures|matches/.test(title);
    return /results|fixtures|matches/.test(title);
}
function hasMatchLikeRows(table) {
    return table.find("tbody > tr[data-ttid]").length > 0;
}
function titleCaseSlug(slug) {
    return slug
        .split("-")
        .filter(Boolean)
        .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
        .join(" ");
}
function recordValue(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
}
function isRecord(value) {
    return value !== null;
}
function arrayValue(value) {
    return Array.isArray(value) ? value : [];
}
function stringValue(value) {
    return typeof value === "string" && cleanText(value) ? cleanText(value) : null;
}
function parseTeamSection($, section, scrapedAt, fallbackTeam) {
    const title = safeText(section.find(selectors.recentResults.title).first()) ?? "";
    const team = title.replace(/last matches/i, "").trim() || safeText(section.find(selectors.recentResults.homeTeam).first()) || fallbackTeam || "Unknown";
    const matches = section.find(selectors.recentResults.rows).toArray().map((row) => parseHistoricalRow($, $(row)));
    const form = section.find(selectors.recentResults.rows).toArray().map((row) => parseFormForRow($, $(row), team));
    const goals = matches.reduce((acc, match) => {
        const normalizedTeam = normalizeTeamName(team);
        const isHome = normalizeTeamName(match.homeTeam) === normalizedTeam;
        if (match.homeScore !== null && match.awayScore !== null) {
            acc.for += isHome ? match.homeScore : match.awayScore;
            acc.against += isHome ? match.awayScore : match.homeScore;
        }
        return acc;
    }, { for: 0, against: 0 });
    return {
        team,
        teamLogo: matches.find((match) => normalizeTeamName(match.homeTeam) === normalizeTeamName(team))?.homeLogo ?? matches[0]?.homeLogo ?? null,
        form,
        wins: form.filter((value) => value === "W").length,
        draws: form.filter((value) => value === "D").length,
        losses: form.filter((value) => value === "L").length,
        goalsFor: goals.for,
        goalsAgainst: goals.against,
        matches,
        scrapedAt,
    };
}
function parseFormForRow($, row, team) {
    const formClass = row.find(selectors.recentResults.form).attr("class") ?? "";
    if (formClass.includes("last-results__form-results-W"))
        return "W";
    if (formClass.includes("last-results__form-results-D"))
        return "D";
    if (formClass.includes("last-results__form-results-L"))
        return "L";
    const score = parseScore(row.find(selectors.recentResults.score).first().text());
    if (score.home === null || score.away === null)
        return "?";
    const normalizedTeam = normalizeTeamName(team);
    const isHome = normalizeTeamName(row.find(selectors.recentResults.homeTeam).first().text()) === normalizedTeam;
    const goalsFor = isHome ? score.home : score.away;
    const goalsAgainst = isHome ? score.away : score.home;
    if (goalsFor > goalsAgainst)
        return "W";
    if (goalsFor < goalsAgainst)
        return "L";
    return "D";
}
//# sourceMappingURL=team-results.parser.js.map