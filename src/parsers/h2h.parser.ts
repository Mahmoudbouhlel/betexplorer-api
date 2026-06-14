import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

import { selectors } from "../constants/selectors.js";
import type {
  HistoricalMatchDto,
  MatchH2HDto,
} from "../types/index.js";
import { parseBetExplorerDateTime } from "../utils/date.js";
import {
  parseScore,
  safeInteger,
  safeNumber,
} from "../utils/number.js";
import {
  cleanText,
  safeText,
} from "../utils/text.js";
import {
  absoluteBetExplorerUrl,
  extractEventIdFromUrl,
  validateEventId,
} from "../utils/url.js";
import {
  emptyMatchOdds,
  parseOddsFromNodes,
} from "./odds.parser.js";

type NodeSet = cheerio.Cheerio<AnyNode>;

export function parseH2H(
  html: string,
  eventId: string,
): MatchH2HDto {
  validateEventId(eventId);

  const $ = cheerio.load(html);

  const component = $(
    selectors.h2h.component,
  ).first();

  const matches = component.length
    ? component
        .find(selectors.h2h.rows)
        .toArray()
        .map((row) =>
          parseHistoricalRow(
            $,
            $(row),
          ),
        )
    : [];

  const homeWins =
    safeInteger(
      component
        .find(
          selectors.h2h.homeWins,
        )
        .first()
        .text(),
    ) ?? 0;

  const draws =
    safeInteger(
      component
        .find(
          selectors.h2h.draws,
        )
        .first()
        .text(),
    ) ?? 0;

  const awayWins =
    safeInteger(
      component
        .find(
          selectors.h2h.awayWins,
        )
        .first()
        .text(),
    ) ?? 0;

  return {
    eventId,

    summary: {
      totalMatches:
        homeWins +
          draws +
          awayWins ||
        matches.length,

      homeWins,
      draws,
      awayWins,

      homeWinPercent:
        parsePercent(
          component
            .find(
              selectors.h2h.homePercent,
            )
            .first(),
        ),

      drawPercent:
        parsePercent(
          component
            .find(
              selectors.h2h.drawPercent,
            )
            .first(),
        ),

      awayWinPercent:
        parsePercent(
          component
            .find(
              selectors.h2h.awayPercent,
            )
            .first(),
        ),
    },

    matches,
    scrapedAt:
      new Date().toISOString(),
  };
}

export function parseHistoricalRow(
  $: cheerio.CheerioAPI,
  row: NodeSet,
): HistoricalMatchDto {
  /*
   * Select the actual participants match link,
   * not the first arbitrary anchor in the row.
   */
  const primaryMatchLink = row
    .find("a.table-main__participants")
    .first();

  const matchLink = primaryMatchLink.length
    ? primaryMatchLink
    : row
        .find("a[href*='/football/']")
        .first();

  const url =
    absoluteBetExplorerUrl(
      matchLink.attr("href"),
    );

  const homeContainer = matchLink
    .find(
      ".table-main__participantHome",
    )
    .first();

  const awayContainer = matchLink
    .find(
      ".table-main__participantAway",
    )
    .first();

  const scoreContainer = matchLink
    .find(
      ".mainResult.mobileHidden, " +
        ".table-main__result, " +
        "[data-live-cell='score'].mobileHidden",
    )
    .first();

  const score = parseScore(
    safeText(scoreContainer) ??
      safeText(
        row
          .find(
            ".mainResult.mobileHidden, " +
              ".mainResult, " +
              ".table-main__result, " +
              "[data-live-cell='score'].mobileHidden",
          )
          .first(),
      ),
  );

  /*
   * Select only the three actual odds,
   * avoiding score/result divs.
   */
  const oddsContainer = row
    .find(
      ".table-main__oddsLi.oddsColumn, " +
        ".last-results__odds-align",
    )
    .last();

  const oddsNodes = oddsContainer
    .find(
      ".table-main__odds[data-oid], " +
        ".table-main__odd[data-odd], " +
        ".table-main__odd[data-oid]",
    );

  const outcomeRaw = cleanText(
    row.attr("data-be-outcome"),
  ).toLowerCase();

  return {
    eventId:
      extractEventIdFromUrl(url),

    dateTime:
      parseBetExplorerDateTime(
        row.attr("data-dt") ?? null,
      ) ??
      safeText(
        row
          .find(
            ".head-to-head__date",
          )
          .first(),
      ),

    competition:
      findHistoricalCompetition(
        row,
      ),

    country:
      findHistoricalCountry(
        row,
      ),

    homeTeam:
      extractParticipantName(
        homeContainer,
      ),

    awayTeam:
      extractParticipantName(
        awayContainer,
      ),

    homeLogo:
      extractParticipantLogo(
        homeContainer,
      ),

    awayLogo:
      extractParticipantLogo(
        awayContainer,
      ),

    homeScore: score.home,
    awayScore: score.away,

    outcome:
      normalizeOutcome(
        outcomeRaw,
        score.home,
        score.away,
      ),

    odds: oddsNodes.length
      ? parseOddsFromNodes(
          oddsNodes,
        )
      : emptyMatchOdds(),

    url,
  };
}

function extractParticipantName(
  container: NodeSet,
): string {
  return (
    cleanText(
      container
        .find(
          "p.table-main__truncate, p",
        )
        .first()
        .text(),
    ) ||
    cleanText(
      container
        .find(
          ".particiantWidthMobile",
        )
        .first()
        .text(),
    ) ||
    cleanText(
      container
        .find(
          "img.table-main__participantLogo",
        )
        .first()
        .attr("alt"),
    )
  );
}

function extractParticipantLogo(
  container: NodeSet,
): string | null {
  const image = container
    .find(
      "img.table-main__participantLogo, img",
    )
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
    const source =
      cleanText(candidate);

    if (
      !source ||
      source.startsWith("data:") ||
      source.startsWith(
        "javascript:",
      ) ||
      source === "about:blank"
    ) {
      continue;
    }

    return (
      absoluteBetExplorerUrl(
        source,
      ) ?? source
    );
  }

  return null;
}

function findHistoricalCompetition(
  row: NodeSet,
): string | null {
  const direct =
    safeText(
      row
        .find(
          ".head-to-head__league, " +
            ".league, " +
            ".competition",
        )
        .first(),
    );

  if (direct) {
    return direct;
  }

  /*
   * The competition header is often the preceding
   * .head-to-head__header within the same section.
   */
  const section =
    row.parent();

  return (
    safeText(
      section
        .find(
          ".head-to-head__header " +
            ".table-main__leaguesNames",
        )
        .first(),
    ) ?? null
  );
}

function findHistoricalCountry(
  row: NodeSet,
): string | null {
  const section =
    row.parent();

  const flag = section
    .find(
      ".head-to-head__header " +
        ".table-main__countryFlags",
    )
    .first();

  return (
    cleanText(flag.attr("title")) ||
    cleanText(flag.attr("alt")) ||
    null
  );
}

function parsePercent(
  node: NodeSet,
): number | null {
  const style =
    node.attr("style") ?? "";

  const widthMatch =
    style.match(
      /width\s*:\s*([\d.]+)%/i,
    );

  if (widthMatch?.[1]) {
    return (
      safeNumber(widthMatch[1]) ??
      null
    );
  }

  return (
    safeNumber(node.text()) ??
    null
  );
}

function normalizeOutcome(
  raw: string,
  home: number | null,
  away: number | null,
): HistoricalMatchDto["outcome"] {
  if (
    raw === "home_win" ||
    raw === "home" ||
    raw === "1"
  ) {
    return "HOME_WIN";
  }

  if (
    raw === "draw" ||
    raw === "x"
  ) {
    return "DRAW";
  }

  if (
    raw === "away_win" ||
    raw === "away" ||
    raw === "2"
  ) {
    return "AWAY_WIN";
  }

  if (
    home === null ||
    away === null
  ) {
    return "UNKNOWN";
  }

  if (home > away) {
    return "HOME_WIN";
  }

  if (home < away) {
    return "AWAY_WIN";
  }

  return "DRAW";
}
