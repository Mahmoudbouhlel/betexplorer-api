import * as cheerio from "cheerio";
import { selectors } from "../constants/selectors.js";
import { parseBetExplorerDateTime } from "../utils/date.js";
import { parseScore, safeInteger, } from "../utils/number.js";
import { cleanText, safeText, } from "../utils/text.js";
import { absoluteBetExplorerUrl, relativeBetExplorerUrl, validateEventId, } from "../utils/url.js";
import { emptyMatchOdds, parseOddsFromNodes, } from "./odds.parser.js";
export function parseMatchList(html, scope = "homepage") {
    const $ = cheerio.load(html);
    const matches = [];
    const indexByEventId = new Map();
    $(selectors.matchList.matchRow).each((_index, element) => {
        const parsed = parseMatchRow($, $(element));
        if (!parsed) {
            return;
        }
        const existingIndex = indexByEventId.get(parsed.eventId);
        if (existingIndex === undefined) {
            indexByEventId.set(parsed.eventId, matches.length);
            matches.push(parsed);
            return;
        }
        const existing = matches[existingIndex];
        if (existing &&
            getMatchCompletenessScore(parsed) >=
                getMatchCompletenessScore(existing)) {
            matches[existingIndex] = parsed;
        }
    });
    return {
        scope,
        count: matches.length,
        matches,
        scrapedAt: new Date().toISOString(),
    };
}
function parseMatchRow($, row) {
    const eventId = cleanText(row.attr("data-event-id"));
    if (!eventId) {
        return null;
    }
    validateEventId(eventId);
    /*
     * All parsing must remain scoped to this match row.
     */
    const info = row
        .find(selectors.matchList.matchInfo)
        .first();
    if (!info.length) {
        return null;
    }
    const matchLink = info
        .find('a[data-live-cell="matchlink"]')
        .first();
    const participantsLink = info
        .find(selectors.matchList.participants)
        .first();
    const participantScope = participantsLink.length
        ? participantsLink
        : matchLink;
    const homeContainer = participantScope
        .find(".table-main__participantHome")
        .first();
    const awayContainer = participantScope
        .find(".table-main__participantAway")
        .first();
    const homeTeam = extractTeamName(homeContainer);
    const awayTeam = extractTeamName(awayContainer);
    const homeLogo = extractParticipantLogo(homeContainer);
    const awayLogo = extractParticipantLogo(awayContainer);
    const rawRelativeUrl = cleanText(matchLink.attr("href")) ||
        cleanText(participantsLink.attr("href")) ||
        null;
    const eventUrl = absoluteBetExplorerUrl(rawRelativeUrl) ?? "";
    const relativeUrl = relativeBetExplorerUrl(eventUrl || rawRelativeUrl) ?? rawRelativeUrl ?? "";
    const rawDate = info.attr("data-dt") ?? null;
    /*
     * Select only the score inside the match-link participant block.
     * This avoids the duplicated mobile score inside the odds column.
     */
    const scoreContainer = findScoreContainer(matchLink, info);
    const scoreText = safeText(scoreContainer);
    const score = parseScore(scoreText);
    /*
     * Select only the real oddsColumn.
     * The sibling mainResult element is a duplicated mobile score.
     */
    const oddsContainer = info
        .find("li.table-main__oddsLi > " +
        ".table-main__oddsLi.oddsColumn")
        .first();
    const oddsNodes = oddsContainer.length > 0
        ? oddsContainer.find(".table-main__odds[data-oid]")
        : info
            .children(".table-main__odds[data-oid]")
            .filter((_index, element) => !$(element).closest('[data-live-cell="score"], .mainResult').length);
    const context = findLeagueContext($, row);
    const rawTime = safeText(info
        .find(".table-main__matchStatus[data-live-cell='time'], " +
        ".table-main__matchHour[data-live-cell='time'], " +
        "[data-live-cell='time']")
        .first());
    return {
        eventId,
        eventUrl,
        relativeUrl,
        country: context.country,
        league: context.league,
        tournamentId: row.attr("data-tid") ?? null,
        timestamp: safeInteger(row.attr("data-ts")),
        dateTime: parseBetExplorerDateTime(rawDate),
        time: rawTime,
        status: inferMatchStatus(row, rawTime, scoreText),
        homeTeam,
        awayTeam,
        homeLogo,
        awayLogo,
        homeScore: score.home,
        awayScore: score.away,
        odds: oddsNodes.length
            ? parseOddsFromNodes(oddsNodes)
            : emptyMatchOdds(),
        rawDate,
    };
}
function extractTeamName(participant) {
    const primaryName = cleanText(participant
        .find("p.table-main__truncate, p")
        .first()
        .text());
    if (primaryName) {
        return primaryName;
    }
    const fallbackName = cleanText(participant
        .find(".particiantWidthMobile")
        .first()
        .text());
    if (fallbackName) {
        return fallbackName;
    }
    return cleanText(participant
        .find("img.table-main__participantLogo")
        .first()
        .attr("alt"));
}
function findScoreContainer(matchLink, info) {
    const linkedScore = matchLink
        .find('[data-live-cell="score"].mobileHidden, ' +
        '[data-live-cell="score"]')
        .first();
    if (linkedScore.length) {
        return linkedScore;
    }
    return info
        .children('[data-live-cell="score"]')
        .first();
}
function extractParticipantLogo(participant) {
    const image = participant
        .find("img.table-main__participantLogo")
        .first();
    if (!image.length) {
        return null;
    }
    const candidates = [
        image.attr("src"),
        image.attr("data-src"),
        image.attr("data-lazy-src"),
        image.attr("data-original"),
    ];
    for (const candidate of candidates) {
        const source = cleanText(candidate);
        if (!source ||
            source.startsWith("data:") ||
            source.startsWith("javascript:") ||
            source === "about:blank") {
            continue;
        }
        return (absoluteBetExplorerUrl(source) ??
            source);
    }
    return null;
}
function findLeagueContext($, row) {
    const container = row.closest(selectors.matchList.leagueContainer);
    const header = container
        .find(selectors.matchList.leagueHeader)
        .first();
    const leagueText = safeText(header
        .find(selectors.matchList.leagueName)
        .first()) ??
        safeText(header) ??
        null;
    const flag = header
        .find(selectors.matchList.countryFlag)
        .first();
    const countryFromFlag = cleanText(flag.attr("title")) ||
        cleanText(flag.attr("alt")) ||
        null;
    const split = leagueText
        ?.split(":")
        .map((part) => cleanText(part))
        .filter(Boolean) ?? [];
    const league = split.length > 1
        ? split.slice(1).join(": ")
        : leagueText;
    const rawCountry = countryFromFlag ||
        split[0] ||
        null;
    const country = rawCountry &&
        league &&
        rawCountry
            .toLowerCase()
            .endsWith(league.toLowerCase())
        ? cleanText(rawCountry.slice(0, -league.length)) || rawCountry
        : rawCountry;
    return {
        country,
        league,
    };
}
function inferMatchStatus(row, rawTime, scoreText) {
    const rowText = `${safeText(row) ?? ""} ` +
        `${row.attr("class") ?? ""}`;
    const text = rowText.toLowerCase();
    const time = cleanText(rawTime).toLowerCase();
    if (/abandoned|aband\.?|abn/.test(`${text} ${time}`)) {
        return "ABANDONED";
    }
    if (/postponed|postp\.?/.test(`${text} ${time}`)) {
        return "POSTPONED";
    }
    if (/cancelled|canceled|canc\.?/.test(`${text} ${time}`)) {
        return "CANCELLED";
    }
    /*
     * BetExplorer commonly uses FIN.
     */
    if (/\bfin\b/.test(time) ||
        /\bfinished\b/.test(text) ||
        /\bft\b/.test(time) ||
        /after penalties|aet|ended/.test(text)) {
        return "FINISHED";
    }
    if (/\bht\b/.test(time) ||
        /^\d{1,3}'$/.test(time) ||
        /live|half-time|second half/.test(`${text} ${time}`)) {
        return "LIVE";
    }
    const hasScore = Boolean(scoreText &&
        /\d+\s*[:.\-–—]\s*\d+/.test(scoreText));
    if (hasScore) {
        return "FINISHED";
    }
    if (/^\d{1,2}:\d{2}$/.test(time)) {
        return "SCHEDULED";
    }
    return "UNKNOWN";
}
function getMatchCompletenessScore(match) {
    let score = 0;
    if (match.homeTeam)
        score += 2;
    if (match.awayTeam)
        score += 2;
    if (match.homeLogo)
        score += 1;
    if (match.awayLogo)
        score += 1;
    if (match.homeScore !== null) {
        score += 1;
    }
    if (match.awayScore !== null) {
        score += 1;
    }
    if (match.odds?.home !== null) {
        score += 1;
    }
    if (match.odds?.draw !== null) {
        score += 1;
    }
    if (match.odds?.away !== null) {
        score += 1;
    }
    if (match.country)
        score += 1;
    if (match.league)
        score += 1;
    if (match.eventUrl)
        score += 1;
    return score;
}
//# sourceMappingURL=match-list.parser.js.map