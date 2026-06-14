import * as cheerio from "cheerio";
import { parseDecimalOdd, parseScore } from "../utils/number.js";
import { cleanText, safeText } from "../utils/text.js";
import { absoluteBetExplorerUrl, extractEventIdFromUrl, extractTeamIdFromTeamUrl, extractTeamSlugFromTeamUrl, validateEventId, } from "../utils/url.js";
import { emptyMatchOdds } from "./odds.parser.js";
export function parseMatchDetails(html, url, eventId = extractEventIdFromUrl(url) ?? "") {
    const $ = cheerio.load(html);
    validateEventId(eventId);
    const structured = findSportsEventJsonLd($);
    const canonicalUrl = absoluteBetExplorerUrl($('link[rel="canonical"]').attr("href")) ?? structured?.url ?? url;
    const [homeFromName, awayFromName] = structured?.name?.split(/\s+-\s+/).map(cleanText) ?? [null, null];
    const homeLink = $("ul.list-details a[href*='/football/team/']").eq(0);
    const awayLink = $("ul.list-details a[href*='/football/team/']").eq(1);
    const homeNameFallback = structured?.homeTeamName ?? homeFromName ?? safeText($(".participant-home, .homeTeam, .table-main__participantHome p").first());
    const awayNameFallback = structured?.awayTeamName ?? awayFromName ?? safeText($(".participant-away, .awayTeam, .table-main__participantAway p").first());
    const score = parseScore(safeText($("#js-score").first()) ?? safeText($(".list-details__item__score, .match-score, .score").first()));
    const detailOdds = parseDetailOdds($);
    const status = resolveStatus({
        visibleStatus: safeText($("[data-live-cell='time'], .match-status, .status").first()),
        jsonLdStatus: structured?.eventStatus ?? null,
        homeScore: score.home,
        awayScore: score.away,
        pageText: safeText($("ul.list-details").first()) ?? "",
    });
    return {
        eventId,
        url: canonicalUrl,
        sport: inferSport(canonicalUrl),
        homeTeam: {
            name: teamName(homeLink, homeNameFallback),
            logo: teamLogo(homeLink, structured?.homeTeamLogo),
            id: extractTeamIdFromTeamUrl(absoluteBetExplorerUrl(homeLink.attr("href"))),
            slug: extractTeamSlugFromTeamUrl(absoluteBetExplorerUrl(homeLink.attr("href"))),
            url: absoluteBetExplorerUrl(homeLink.attr("href")),
        },
        awayTeam: {
            name: teamName(awayLink, awayNameFallback),
            logo: teamLogo(awayLink, structured?.awayTeamLogo),
            id: extractTeamIdFromTeamUrl(absoluteBetExplorerUrl(awayLink.attr("href"))),
            slug: extractTeamSlugFromTeamUrl(absoluteBetExplorerUrl(awayLink.attr("href"))),
            url: absoluteBetExplorerUrl(awayLink.attr("href")),
        },
        competition: structured?.competition ?? breadcrumbCompetition($) ?? safeText($(".list-details__item__league, .breadcrumb a").last()),
        country: structured?.country ?? countryFromUrl(canonicalUrl),
        startDate: structured?.startDate ?? parseHeaderDate($("#match-date").text()),
        status,
        venue: structured?.venue ?? null,
        locality: structured?.locality ?? null,
        homeScore: score.home,
        awayScore: score.away,
        odds: detailOdds.best,
        referenceOdds: detailOdds.reference,
        bookmakerOdds: detailOdds.rows,
        scrapedAt: new Date().toISOString(),
    };
}
export function findSportsEventJsonLd($) {
    const records = [];
    $('script[type="application/ld+json"]').each((_index, script) => {
        const raw = cleanText($(script).text());
        if (!raw)
            return;
        try {
            collectJsonRecords(JSON.parse(raw), records);
        }
        catch {
            return;
        }
    });
    const sportsEvent = records.find((record) => {
        const type = record["@type"];
        return Array.isArray(type) ? type.includes("SportsEvent") : type === "SportsEvent";
    });
    if (!sportsEvent)
        return null;
    const location = recordValue(sportsEvent.location);
    const address = recordValue(location?.address);
    const home = recordValue(sportsEvent.homeTeam);
    const away = recordValue(sportsEvent.awayTeam);
    const organizer = recordValue(sportsEvent.organizer);
    return {
        name: stringValue(sportsEvent.name),
        startDate: stringValue(sportsEvent.startDate),
        eventStatus: stringValue(sportsEvent.eventStatus),
        url: absoluteBetExplorerUrl(stringValue(sportsEvent.url)) ?? stringValue(sportsEvent.url),
        venue: stringValue(location?.name),
        locality: stringValue(address?.addressLocality),
        country: stringValue(address?.addressCountry),
        homeTeamName: stringValue(home?.name),
        awayTeamName: stringValue(away?.name),
        homeTeamLogo: absoluteBetExplorerUrl(stringValue(home?.image)) ?? stringValue(home?.image),
        awayTeamLogo: absoluteBetExplorerUrl(stringValue(away?.image)) ?? stringValue(away?.image),
        competition: stringValue(organizer?.name),
    };
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
function parseDetailOdds($) {
    const rows = [];
    $("#bestOddsComponent table.oddsComparison__table tbody tr").each((_index, element) => {
        const row = $(element);
        const cells = row
            .children("td.table-main__detail-odds")
            .filter((_cellIndex, cell) => !$(cell).hasClass("inactive"))
            .toArray()
            .slice(0, 3)
            .map((cell) => $(cell));
        if (cells.length < 3)
            return;
        const bookmakerLink = row.find("a[href*='/bookmaker/']").first();
        const parsedRow = {
            bookmakerId: cleanText(row.attr("data-bookie-id")) || cleanText(bookmakerLink.attr("data-bid")) || null,
            bookmakerName: safeText(bookmakerLink),
            home: oddFromCell(cells[0]),
            draw: oddFromCell(cells[1]),
            away: oddFromCell(cells[2]),
            createdAt: cleanText(row.attr("data-created")) || null,
        };
        if ([parsedRow.home, parsedRow.draw, parsedRow.away].some((odd) => odd !== null)) {
            rows.push(parsedRow);
        }
    });
    const reference = rows.find((row) => row.home !== null && row.draw !== null && row.away !== null) ?? null;
    const best = rows.reduce((acc, row) => ({
        home: maxOdd(acc.home, row.home),
        draw: maxOdd(acc.draw, row.draw),
        away: maxOdd(acc.away, row.away),
        homeOutcomeId: null,
        drawOutcomeId: null,
        awayOutcomeId: null,
        available: true,
    }), emptyMatchOdds());
    return {
        best: best.available ? best : null,
        reference: reference
            ? {
                home: reference.home,
                draw: reference.draw,
                away: reference.away,
                homeOutcomeId: null,
                drawOutcomeId: null,
                awayOutcomeId: null,
                available: true,
            }
            : null,
        rows,
    };
}
function oddFromCell(cell) {
    if (!cell)
        return null;
    return parseDecimalOdd(cell.attr("data-odd")) ?? parseDecimalOdd(cell.find("[data-odd]").first().attr("data-odd")) ?? parseDecimalOdd(cell.text());
}
function maxOdd(left, right) {
    if (left === null)
        return right;
    if (right === null)
        return left;
    return Math.max(left, right);
}
function resolveStatus(input) {
    const visible = normalizeVisibleStatus(input.visibleStatus);
    const jsonLd = normalizeJsonLdStatus(input.jsonLdStatus);
    const hasCompleteScore = input.homeScore !== null && input.awayScore !== null;
    const visibleText = cleanText(input.pageText).toLowerCase();
    if (visible === "FINISHED" || jsonLd === "FINISHED")
        return "FINISHED";
    if (visible === "POSTPONED" || jsonLd === "POSTPONED")
        return "POSTPONED";
    if (visible === "CANCELLED" || jsonLd === "CANCELLED")
        return "CANCELLED";
    if (visible === "ABANDONED")
        return "ABANDONED";
    if (visible === "LIVE" || jsonLd === "LIVE")
        return "LIVE";
    if (hasCompleteScore && /(?:\(\d+\s*[:–—-]\s*\d+)/u.test(visibleText))
        return "FINISHED";
    if (visible === "SCHEDULED" || jsonLd === "SCHEDULED")
        return "SCHEDULED";
    if (hasCompleteScore)
        return "FINISHED";
    return "UNKNOWN";
}
function normalizeVisibleStatus(status) {
    const text = cleanText(status).toUpperCase();
    if (!text)
        return null;
    if (/^(FIN|FT|AET|PEN)$/.test(text))
        return "FINISHED";
    if (/^\d{1,2}:\d{2}$/.test(text))
        return "SCHEDULED";
    if (/^\d{1,3}(?:\+\d{1,2})?'$/.test(text) || text === "HT")
        return "LIVE";
    if (/POSTP/.test(text))
        return "POSTPONED";
    if (/CANC/.test(text))
        return "CANCELLED";
    if (/ABN/.test(text))
        return "ABANDONED";
    return null;
}
function normalizeJsonLdStatus(status) {
    if (!status)
        return null;
    if (status.includes("EventScheduled") || status.includes("EventMovedOnline"))
        return "SCHEDULED";
    if (status.includes("EventInProgress"))
        return "LIVE";
    if (status.includes("EventCompleted") || status.includes("EventEnded"))
        return "FINISHED";
    if (status.includes("EventPostponed"))
        return "POSTPONED";
    if (status.includes("EventCancelled"))
        return "CANCELLED";
    return null;
}
function teamName(link, fallback) {
    return safeText(link.find(".list-details__item__title, .teamsLink").first()) ?? safeText(link) ?? fallback ?? "";
}
function teamLogo(link, fallback) {
    return (absoluteBetExplorerUrl(link.find("img").first().attr("src")) ??
        absoluteBetExplorerUrl(link.find("img").first().attr("data-src")) ??
        fallback ??
        null);
}
function parseHeaderDate(raw) {
    const text = cleanText(raw);
    const match = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})\s*-\s*(\d{1,2}):(\d{2})/);
    if (!match)
        return null;
    const [, day, month, year, hour, minute] = match;
    return `${year}-${month?.padStart(2, "0")}-${day?.padStart(2, "0")}T${hour?.padStart(2, "0")}:${minute}:00`;
}
function breadcrumbCompetition($) {
    const items = $('script[type="application/ld+json"]')
        .toArray()
        .flatMap((script) => {
        try {
            const parsed = JSON.parse(cleanText($(script).text()));
            const records = [];
            collectJsonRecords(parsed, records);
            return records;
        }
        catch {
            return [];
        }
    });
    const breadcrumb = items.find((item) => item["@type"] === "BreadcrumbList");
    const listItems = arrayValue(breadcrumb?.itemListElement).map(recordValue).filter(isRecord);
    return stringValue(listItems[3]?.name);
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
function inferSport(url) {
    const parsed = absoluteBetExplorerUrl(url);
    const segment = parsed ? new URL(parsed).pathname.split("/").filter(Boolean)[0] : null;
    return segment ?? null;
}
function countryFromUrl(url) {
    const parsed = absoluteBetExplorerUrl(url);
    const segment = parsed ? new URL(parsed).pathname.split("/").filter(Boolean)[1] : null;
    return segment ? segment.replaceAll("-", " ") : null;
}
//# sourceMappingURL=match-details.parser.js.map