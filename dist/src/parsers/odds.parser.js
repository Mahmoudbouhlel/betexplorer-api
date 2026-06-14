import * as cheerio from "cheerio";
import { parseDecimalOdd } from "../utils/number.js";
import { cleanText } from "../utils/text.js";
const EMPTY_ODDS = {
    home: null,
    draw: null,
    away: null,
    homeOutcomeId: null,
    drawOutcomeId: null,
    awayOutcomeId: null,
    available: false,
};
export function emptyMatchOdds() {
    return { ...EMPTY_ODDS };
}
export function parseOddsFromNodes(nodes) {
    const oddsNodes = nodes
        .toArray()
        .slice(0, 3);
    const homeElement = oddsNodes[0]
        ? nodes.eq(0)
        : null;
    const drawElement = oddsNodes[1]
        ? nodes.eq(1)
        : null;
    const awayElement = oddsNodes[2]
        ? nodes.eq(2)
        : null;
    const home = homeElement
        ? parseOddFromNode(homeElement)
        : null;
    const draw = drawElement
        ? parseOddFromNode(drawElement)
        : null;
    const away = awayElement
        ? parseOddFromNode(awayElement)
        : null;
    return {
        home,
        draw,
        away,
        homeOutcomeId: homeElement?.attr("data-oid")?.trim() || null,
        drawOutcomeId: drawElement?.attr("data-oid")?.trim() || null,
        awayOutcomeId: awayElement?.attr("data-oid")?.trim() || null,
        available: [home, draw, away].some((odd) => odd !== null),
    };
}
export function parseOddFromNode(node) {
    const candidates = [
        node.attr("data-odd"),
        node
            .find("[data-odd]")
            .first()
            .attr("data-odd"),
        cleanText(node
            .find("button")
            .first()
            .text()),
        cleanText(node
            .find("p")
            .first()
            .text()),
        cleanText(node.text()),
    ];
    for (const candidate of candidates) {
        const odd = parseDecimalOdd(candidate);
        if (odd !== null) {
            return odd;
        }
    }
    return null;
}
//# sourceMappingURL=odds.parser.js.map