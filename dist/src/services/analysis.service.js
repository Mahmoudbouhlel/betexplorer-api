import { getMatchDetails } from "./match-details.service.js";
import { getMatchH2H } from "./h2h.service.js";
import { getRecentResults } from "./team-results.service.js";
import { getMatchStandings } from "./standings.service.js";
export async function getMatchAnalysis(eventId, options = {}) {
    const warnings = [];
    const details = await getMatchDetails(eventId, withoutUndefinedUrl(options.url)).then((response) => response.data);
    const [standings, h2h, recentResults] = await Promise.all([
        getMatchStandings(eventId, { url: options.url ?? details.url, backgroundRefresh: false }).then((response) => response.data).catch((error) => {
            warnings.push(errorMessage(error));
            return null;
        }),
        getMatchH2H(eventId, { url: options.url ?? details.url, backgroundRefresh: false }).then((response) => response.data).catch((error) => {
            warnings.push(errorMessage(error));
            return null;
        }),
        getRecentResults(eventId, { url: options.url ?? details.url, backgroundRefresh: false }).then((response) => response.data).catch((error) => {
            warnings.push(errorMessage(error));
            return null;
        }),
    ]);
    return {
        data: analyzeStructuredMatch(eventId, details, standings, h2h, recentResults),
        warnings,
    };
}
function analyzeStructuredMatch(eventId, details, standings, h2h, recentResults) {
    const mode = analysisMode(details.status);
    const market = marketAnalysis(details.odds);
    const probabilities = market.normalized;
    const missing = missingInputs(details, standings, h2h, recentResults);
    const dataQualityScore = clamp((details.status !== "UNKNOWN" ? 15 : 0) +
        (details.homeScore !== null && details.awayScore !== null ? 10 : 0) +
        (details.odds?.available ? 20 : 0) +
        (standings?.groups.length ? 20 : 0) +
        (h2h?.matches.filter((match) => match.eventId !== eventId).length ? 20 : 0) +
        (recentSampleSize(recentResults) > 0 ? 15 : 0));
    const sampleFactor = clamp((h2h?.matches.filter((match) => match.eventId !== eventId).length ?? 0) * 12 + recentSampleSize(recentResults) * 4);
    const confidenceScore = clamp(Math.round(dataQualityScore * 0.7 + sampleFactor * 0.3));
    const actualResult = actualResultFrom(details);
    const candidates = mode === "PRE_MATCH" ? candidatesFrom(probabilities, details.odds) : [];
    const recommendation = recommendationFrom(mode, candidates, dataQualityScore, confidenceScore);
    return {
        eventId,
        status: details.status,
        mode,
        probabilities,
        market,
        dataQuality: {
            score: dataQualityScore,
            level: qualityLevel(dataQualityScore),
            formula: "status 15 + score 10 + odds 20 + standings 20 + non-current H2H 20 + recent sample 15",
            missing,
        },
        confidence: {
            score: confidenceScore,
            level: qualityLevel(confidenceScore),
            formula: "round(dataQuality * 0.70 + sampleFactor * 0.30)",
            missing,
        },
        candidates,
        recommendation,
        supportingFactors: supportingFactors(standings, h2h, recentResults),
        contradictions: [],
        actualResult,
        generatedAt: new Date().toISOString(),
    };
}
function marketAnalysis(odds) {
    const raw = {
        home: implied(odds?.home),
        draw: implied(odds?.draw),
        away: implied(odds?.away),
    };
    const rawValues = [raw.home, raw.draw, raw.away];
    const sum = rawValues.reduce((total, value) => total + (value ?? 0), 0);
    const complete = raw.home !== null && raw.draw !== null && raw.away !== null && sum > 0;
    return {
        rawImplied: raw,
        normalized: complete
            ? {
                home: roundProbability((raw.home ?? 0) / sum),
                draw: roundProbability((raw.draw ?? 0) / sum),
                away: roundProbability((raw.away ?? 0) / sum),
            }
            : { home: null, draw: null, away: null },
        overround: complete ? roundProbability(sum - 1) : null,
        formula: "raw implied = 1 / decimal odd; normalized = raw / rawSum; overround = rawSum - 1",
    };
}
function candidatesFrom(probabilities, odds) {
    const markets = [
        { type: "HOME", probability: probabilities.home, odd: odds?.home },
        { type: "DRAW", probability: probabilities.draw, odd: odds?.draw },
        { type: "AWAY", probability: probabilities.away, odd: odds?.away },
    ];
    return markets.flatMap((market) => {
        if (market.probability === null || !market.odd)
            return [];
        const marketProbability = 1 / market.odd;
        const edge = market.probability - marketProbability;
        const expectedValue = market.probability * market.odd - 1;
        if (edge < 0.03 || expectedValue <= 0)
            return [];
        return [{
                type: market.type,
                modelProbability: roundProbability(market.probability),
                marketProbability: roundProbability(marketProbability),
                edgePercentagePoints: Math.round(edge * 10_000) / 100,
                expectedValue: Math.round(expectedValue * 10_000) / 10_000,
            }];
    });
}
function recommendationFrom(mode, candidates, dataQuality, confidence) {
    if (mode === "POST_MATCH") {
        return { decision: "POST_MATCH_ONLY", primaryCandidate: null, reasons: ["Finished match; no active betting recommendation."] };
    }
    if (mode === "LIVE" || mode === "UNAVAILABLE") {
        return { decision: "UNAVAILABLE", primaryCandidate: null, reasons: ["Match state is not suitable for a pre-match recommendation."] };
    }
    if (dataQuality < 70)
        return { decision: "NO_BET", primaryCandidate: null, reasons: ["Data quality below 70."] };
    if (confidence < 65)
        return { decision: "NO_BET", primaryCandidate: null, reasons: ["Confidence below 65."] };
    const primaryCandidate = candidates[0] ?? null;
    if (!primaryCandidate)
        return { decision: "NO_BET", primaryCandidate: null, reasons: ["No positive expected-value candidate above edge threshold."] };
    return { decision: "BET_CANDIDATE", primaryCandidate, reasons: ["Candidate passed data-quality, confidence, edge, and expected-value gates."] };
}
function analysisMode(status) {
    if (status === "SCHEDULED")
        return "PRE_MATCH";
    if (status === "LIVE")
        return "LIVE";
    if (status === "FINISHED")
        return "POST_MATCH";
    return "UNAVAILABLE";
}
function actualResultFrom(details) {
    if (details.homeScore === null || details.awayScore === null)
        return null;
    return {
        homeScore: details.homeScore,
        awayScore: details.awayScore,
        outcome: details.homeScore > details.awayScore ? "HOME" : details.homeScore < details.awayScore ? "AWAY" : "DRAW",
        btts: details.homeScore > 0 && details.awayScore > 0,
        over25: details.homeScore + details.awayScore > 2.5,
    };
}
function missingInputs(details, standings, h2h, recentResults) {
    const missing = [];
    if (!details.odds?.available)
        missing.push("odds");
    if (!standings?.groups.length)
        missing.push("standings");
    if (!h2h?.matches.length)
        missing.push("h2h");
    if (recentSampleSize(recentResults) === 0)
        missing.push("recent results");
    return missing;
}
function recentSampleSize(recentResults) {
    return (recentResults?.home.matches.length ?? 0) + (recentResults?.away.matches.length ?? 0);
}
function supportingFactors(standings, h2h, recentResults) {
    const factors = [];
    if (standings?.homeTeamRow && standings.awayTeamRow)
        factors.push("Current teams resolved in standings.");
    if (h2h?.matches.length)
        factors.push("Head-to-head rows parsed; current event is excluded from pre-match sample factors.");
    if (recentSampleSize(recentResults) > 0)
        factors.push("Recent-result sample parsed from source.");
    return factors;
}
function implied(odd) {
    return typeof odd === "number" && Number.isFinite(odd) && odd > 1 ? roundProbability(1 / odd) : null;
}
function roundProbability(value) {
    return Number.isFinite(value) ? Math.round(value * 10_000) / 10_000 : 0;
}
function clamp(value) {
    return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}
function qualityLevel(score) {
    if (score < 40)
        return "INSUFFICIENT";
    if (score < 60)
        return "LOW";
    if (score < 80)
        return "MEDIUM";
    return "HIGH";
}
function errorMessage(error) {
    return error instanceof Error ? error.message : "UNKNOWN_ERROR";
}
function withoutUndefinedUrl(url) {
    return url ? { url, backgroundRefresh: false } : { backgroundRefresh: false };
}
//# sourceMappingURL=analysis.service.js.map