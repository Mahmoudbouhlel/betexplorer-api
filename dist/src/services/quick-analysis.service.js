import { getKnownMatchSummary } from "../cache/match-list.cache.js";
import { validateEventId } from "../utils/url.js";
import { getMatchDetails } from "./match-details.service.js";
import { getMatchH2H } from "./h2h.service.js";
import { getRecentResults } from "./team-results.service.js";
import { getMatchStandings } from "./standings.service.js";
export const QUICK_ANALYSIS_BATCH_SIZE = 30;
export const QUICK_ANALYSIS_CONCURRENCY = 3;
const marketLabels = {
    HOME: "1",
    DRAW: "X",
    AWAY: "2",
    HOME_OR_DRAW: "1X",
    DRAW_OR_AWAY: "X2",
    HOME_OR_AWAY: "12",
    OVER_1_5: "Over 1.5",
    UNDER_1_5: "Under 1.5",
    OVER_2_5: "Over 2.5",
    UNDER_2_5: "Under 2.5",
    BTTS_YES: "GG Yes",
    BTTS_NO: "GG No",
    NO_BET: "No bet",
};
const marketPriority = [
    "HOME",
    "DRAW",
    "AWAY",
    "HOME_OR_DRAW",
    "DRAW_OR_AWAY",
    "HOME_OR_AWAY",
    "OVER_1_5",
    "UNDER_1_5",
    "OVER_2_5",
    "UNDER_2_5",
    "BTTS_YES",
    "BTTS_NO",
    "NO_BET",
];
export async function getQuickMatchAnalyses(eventIds) {
    const uniqueIds = uniqueEventIds(eventIds).slice(0, QUICK_ANALYSIS_BATCH_SIZE);
    return runLimited(uniqueIds, QUICK_ANALYSIS_CONCURRENCY, async (eventId) => {
        try {
            return await getQuickMatchAnalysis(eventId);
        }
        catch (error) {
            return unavailableQuickAnalysis(eventId, errorMessage(error));
        }
    });
}
export async function getQuickMatchAnalysis(eventId) {
    validateEventId(eventId);
    const inputs = await loadQuickInputs(eventId);
    return buildQuickAnalysis(eventId, inputs);
}
function uniqueEventIds(eventIds) {
    const seen = new Set();
    const unique = [];
    for (const raw of eventIds) {
        const eventId = raw.trim();
        validateEventId(eventId);
        if (seen.has(eventId))
            continue;
        seen.add(eventId);
        unique.push(eventId);
    }
    return unique;
}
async function loadQuickInputs(eventId) {
    const summary = getKnownMatchSummary(eventId);
    const inputWarnings = [];
    if (summary && summary.status === "FINISHED" && summary.homeScore !== null && summary.awayScore !== null) {
        return { summary, details: null, standings: null, h2h: null, recentResults: null, inputWarnings };
    }
    if (summary && summary.status === "LIVE") {
        return { summary, details: null, standings: null, h2h: null, recentResults: null, inputWarnings };
    }
    let loadedDetails;
    try {
        loadedDetails = await getMatchDetails(eventId, summary?.eventUrl ? { url: summary.eventUrl, backgroundRefresh: false } : { backgroundRefresh: false }).then((response) => response.data);
    }
    catch (error) {
        inputWarnings.push(errorMessage(error));
        return { summary, details: null, standings: null, h2h: null, recentResults: null, inputWarnings };
    }
    const status = loadedDetails.status !== "UNKNOWN" ? loadedDetails.status : summary?.status ?? "UNKNOWN";
    if (status !== "SCHEDULED") {
        return { summary, details: loadedDetails, standings: null, h2h: null, recentResults: null, inputWarnings };
    }
    const url = summary?.eventUrl ?? loadedDetails.url;
    const [standings, h2h, recentResults] = await Promise.all([
        getMatchStandings(eventId, { url, backgroundRefresh: false }).then((response) => response.data).catch((error) => {
            inputWarnings.push(errorMessage(error));
            return null;
        }),
        getMatchH2H(eventId, { url, backgroundRefresh: false }).then((response) => response.data).catch((error) => {
            inputWarnings.push(errorMessage(error));
            return null;
        }),
        getRecentResults(eventId, { url, backgroundRefresh: false }).then((response) => response.data).catch((error) => {
            inputWarnings.push(errorMessage(error));
            return null;
        }),
    ]);
    return { summary, details: loadedDetails, standings, h2h, recentResults, inputWarnings };
}
function buildQuickAnalysis(eventId, inputs) {
    const status = resolvedStatus(inputs);
    const mode = analysisMode(status);
    const odds = inputs.details?.odds ?? inputs.summary?.odds ?? null;
    const outcomeProbabilities = normalize1x2(odds);
    const form = formFrom(inputs.recentResults);
    const stats = statsFrom(eventId, inputs.recentResults, inputs.h2h);
    const expectedGoals = expectedGoalsFrom(stats);
    const probabilities = {
        ...outcomeProbabilities,
        ...goalProbabilitiesFrom(stats, expectedGoals),
    };
    const quality = qualityFrom(status, odds, inputs, stats, expectedGoals);
    const contradictions = contradictionsFrom(probabilities, odds, stats, inputs, quality);
    const recommendations = recommendationsFrom(probabilities, odds, quality, mode, form, contradictions);
    const primaryRecommendation = recommendations.find((item) => item.eligible) ?? null;
    const alternativeRecommendations = alternativesFrom(primaryRecommendation, recommendations);
    const decision = decisionFrom(mode, primaryRecommendation);
    const rejectionReasons = rejectionReasonsFrom(decision, quality, odds, form, contradictions, primaryRecommendation, inputs);
    return {
        eventId,
        status,
        mode,
        decision,
        primaryRecommendation,
        alternativeRecommendations,
        probabilities,
        expectedGoals,
        form,
        stats,
        dataQuality: quality.dataQuality,
        confidence: quality.confidence,
        risk: quality.risk,
        supportingFactors: supportingFactorsFrom(probabilities, odds, form, stats, expectedGoals, inputs, primaryRecommendation),
        contradictions,
        rejectionReasons,
        generatedAt: new Date().toISOString(),
    };
}
function resolvedStatus(inputs) {
    const detailStatus = inputs.details?.status;
    if (detailStatus && detailStatus !== "UNKNOWN")
        return detailStatus;
    return inputs.summary?.status ?? detailStatus ?? "UNKNOWN";
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
function normalize1x2(odds) {
    const raw = {
        home: implied(odds?.home),
        draw: implied(odds?.draw),
        away: implied(odds?.away),
    };
    const sum = (raw.home ?? 0) + (raw.draw ?? 0) + (raw.away ?? 0);
    if (raw.home === null || raw.draw === null || raw.away === null || sum <= 0) {
        return { home: null, draw: null, away: null };
    }
    return {
        home: roundProbability(raw.home / sum),
        draw: roundProbability(raw.draw / sum),
        away: roundProbability(raw.away / sum),
    };
}
function formFrom(recentResults) {
    return {
        home: recentResults?.home.form.length ? recentResults.home.form.slice(0, 5).join("-") : null,
        away: recentResults?.away.form.length ? recentResults.away.form.slice(0, 5).join("-") : null,
        homeSampleSize: summarizableMatches(recentResults?.home.matches ?? []).length,
        awaySampleSize: summarizableMatches(recentResults?.away.matches ?? []).length,
    };
}
function statsFrom(eventId, recentResults, h2h) {
    const homeMatches = summarizableMatches(recentResults?.home.matches ?? []);
    const awayMatches = summarizableMatches(recentResults?.away.matches ?? []);
    const h2hMatches = summarizableMatches((h2h?.matches ?? []).filter((match) => match.eventId !== eventId));
    return {
        homeAverageScored: averageFromTotal(recentResults?.home.goalsFor, homeMatches.length),
        awayAverageScored: averageFromTotal(recentResults?.away.goalsFor, awayMatches.length),
        homeAverageConceded: averageFromTotal(recentResults?.home.goalsAgainst, homeMatches.length),
        awayAverageConceded: averageFromTotal(recentResults?.away.goalsAgainst, awayMatches.length),
        homeOver15Rate: rate(homeMatches, (match) => totalGoals(match) > 1.5),
        awayOver15Rate: rate(awayMatches, (match) => totalGoals(match) > 1.5),
        homeOver25Rate: rate(homeMatches, (match) => totalGoals(match) > 2.5),
        awayOver25Rate: rate(awayMatches, (match) => totalGoals(match) > 2.5),
        homeBttsRate: rate(homeMatches, (match) => bothTeamsScored(match)),
        awayBttsRate: rate(awayMatches, (match) => bothTeamsScored(match)),
        h2hMatches: h2hMatches.length,
        h2hOver15Rate: rate(h2hMatches, (match) => totalGoals(match) > 1.5),
        h2hOver25Rate: rate(h2hMatches, (match) => totalGoals(match) > 2.5),
        h2hBttsRate: rate(h2hMatches, (match) => bothTeamsScored(match)),
    };
}
function expectedGoalsFrom(stats) {
    const home = averageDefined([stats.homeAverageScored, stats.awayAverageConceded]);
    const away = averageDefined([stats.awayAverageScored, stats.homeAverageConceded]);
    return {
        home,
        away,
        total: home === null || away === null ? null : roundDecimal(home + away),
    };
}
function goalProbabilitiesFrom(stats, expectedGoals) {
    const over15 = weightedAverage([
        [stats.homeOver15Rate, 2],
        [stats.awayOver15Rate, 2],
        [stats.h2hOver15Rate, 1],
        [expectedGoals.total === null ? null : poissonOver(expectedGoals.total, 1.5), 1],
    ]);
    const over25 = weightedAverage([
        [stats.homeOver25Rate, 2],
        [stats.awayOver25Rate, 2],
        [stats.h2hOver25Rate, 1],
        [expectedGoals.total === null ? null : poissonOver(expectedGoals.total, 2.5), 1],
    ]);
    const bttsYes = weightedAverage([
        [stats.homeBttsRate, 2],
        [stats.awayBttsRate, 2],
        [stats.h2hBttsRate, 1],
        [expectedGoals.home === null || expectedGoals.away === null ? null : poissonBtts(expectedGoals.home, expectedGoals.away), 1],
    ]);
    return {
        over15,
        under15: over15 === null ? null : roundProbability(1 - over15),
        over25,
        under25: over25 === null ? null : roundProbability(1 - over25),
        bttsYes,
        bttsNo: bttsYes === null ? null : roundProbability(1 - bttsYes),
    };
}
function qualityFrom(status, odds, inputs, stats, expectedGoals) {
    const oddsComplete = completeOdds(odds);
    const homeSample = summarizableMatches(inputs.recentResults?.home.matches ?? []).length;
    const awaySample = summarizableMatches(inputs.recentResults?.away.matches ?? []).length;
    const scoredFinished = status === "FINISHED" && (inputs.details?.homeScore ?? inputs.summary?.homeScore) !== null && (inputs.details?.awayScore ?? inputs.summary?.awayScore) !== null;
    const dataQualityScore = clamp((status !== "UNKNOWN" ? 10 : 0) +
        (scoredFinished ? 15 : 0) +
        (oddsComplete ? 20 : 0) +
        (homeSample > 0 ? 10 : 0) +
        (awaySample > 0 ? 10 : 0) +
        (homeSample >= 3 && awaySample >= 3 ? 10 : 0) +
        (stats.h2hMatches > 0 ? 15 : 0) +
        (inputs.standings?.homeTeamRow && inputs.standings.awayTeamRow ? 10 : 0) +
        (expectedGoals.total !== null ? 10 : 0));
    const sampleScore = clamp((homeSample + awaySample) * 8 + stats.h2hMatches * 5);
    const confidenceScore = clamp(Math.round(dataQualityScore * 0.7 + sampleScore * 0.3));
    const risk = riskFrom(dataQualityScore, confidenceScore, inputs.inputWarnings.length);
    return {
        dataQuality: { score: dataQualityScore, label: qualityLabel(dataQualityScore) },
        confidence: { score: confidenceScore, label: qualityLabel(confidenceScore) },
        risk,
    };
}
function recommendationsFrom(probabilities, odds, quality, mode, form, contradictions) {
    const canRecommend = mode === "PRE_MATCH" && quality.dataQuality.score >= 60 && quality.confidence.score >= 55 && contradictions.length < 3;
    const sampleReady = form.homeSampleSize + form.awaySampleSize >= 4;
    const recommendations = [
        outcomeRecommendation("HOME", probabilities.home, odds?.home ?? null, quality, canRecommend),
        outcomeRecommendation("DRAW", probabilities.draw, odds?.draw ?? null, quality, canRecommend),
        outcomeRecommendation("AWAY", probabilities.away, odds?.away ?? null, quality, canRecommend),
        statisticalRecommendation("HOME_OR_DRAW", sumProbabilities([probabilities.home, probabilities.draw]), quality, canRecommend, 0.72),
        statisticalRecommendation("DRAW_OR_AWAY", sumProbabilities([probabilities.draw, probabilities.away]), quality, canRecommend, 0.72),
        statisticalRecommendation("HOME_OR_AWAY", sumProbabilities([probabilities.home, probabilities.away]), quality, canRecommend, 0.72),
        statisticalRecommendation("OVER_1_5", probabilities.over15, quality, canRecommend && sampleReady, 0.7),
        statisticalRecommendation("UNDER_1_5", probabilities.under15, quality, canRecommend && sampleReady, 0.65),
        statisticalRecommendation("OVER_2_5", probabilities.over25, quality, canRecommend && sampleReady, 0.62),
        statisticalRecommendation("UNDER_2_5", probabilities.under25, quality, canRecommend && sampleReady, 0.62),
        statisticalRecommendation("BTTS_YES", probabilities.bttsYes, quality, canRecommend && sampleReady, 0.62),
        statisticalRecommendation("BTTS_NO", probabilities.bttsNo, quality, canRecommend && sampleReady, 0.62),
    ];
    return recommendations.sort(compareRecommendations);
}
function outcomeRecommendation(market, probability, odd, quality, canRecommend) {
    const marketProbability = implied(odd);
    const edge = probability === null || marketProbability === null ? null : roundPercentagePoints(probability - marketProbability);
    const expectedValuePercent = probability === null || odd === null ? null : roundPercentagePoints(probability * odd - 1);
    return {
        market,
        label: marketLabels[market],
        probability,
        decimalOdd: odd,
        edgePercentagePoints: edge,
        expectedValuePercent,
        confidenceScore: quality.confidence.score,
        risk: quality.risk,
        eligible: Boolean(canRecommend && probability !== null && edge !== null && expectedValuePercent !== null && edge >= 3 && expectedValuePercent > 0),
    };
}
function statisticalRecommendation(market, probability, quality, canRecommend, threshold) {
    return {
        market,
        label: marketLabels[market],
        probability,
        decimalOdd: null,
        edgePercentagePoints: null,
        expectedValuePercent: null,
        confidenceScore: quality.confidence.score,
        risk: quality.risk,
        eligible: Boolean(canRecommend && probability !== null && probability >= threshold),
    };
}
function alternativesFrom(primary, recommendations) {
    if (!primary)
        return [];
    const alternatives = [];
    for (const recommendation of recommendations) {
        if (!recommendation.eligible || recommendation.market === primary.market)
            continue;
        if (isContradictory(primary.market, recommendation.market))
            continue;
        if (alternatives.some((item) => isContradictory(item.market, recommendation.market)))
            continue;
        alternatives.push(recommendation);
        if (alternatives.length === 2)
            break;
    }
    return alternatives;
}
function decisionFrom(mode, primary) {
    if (mode === "POST_MATCH")
        return "POST_MATCH_ONLY";
    if (mode === "LIVE" || mode === "UNAVAILABLE")
        return "UNAVAILABLE";
    return primary ? "BET_CANDIDATE" : "NO_BET";
}
function rejectionReasonsFrom(decision, quality, odds, form, contradictions, primary, inputs) {
    if (decision === "BET_CANDIDATE" || primary)
        return [];
    if (decision === "POST_MATCH_ONLY")
        return ["Finished match; active recommendations are disabled."];
    if (decision === "UNAVAILABLE")
        return ["Match state is not suitable for pre-match betting analysis."];
    const reasons = [];
    if (form.homeSampleSize + form.awaySampleSize < 4)
        reasons.push("Insufficient recent-match data");
    if (quality.dataQuality.score < 60)
        reasons.push("Low data quality");
    if (quality.confidence.score < 55)
        reasons.push("Low confidence");
    if (!completeOdds(odds))
        reasons.push("Incomplete odds");
    if (contradictions.length)
        reasons.push("Conflicting signals");
    if (completeOdds(odds))
        reasons.push("No positive market edge");
    for (const warning of inputs.inputWarnings.slice(0, 2))
        reasons.push(warning);
    return uniqueStrings(reasons);
}
function supportingFactorsFrom(probabilities, odds, form, stats, expectedGoals, inputs, primary) {
    const factors = [];
    if (primary?.eligible)
        factors.push(`${primary.label} passed backend eligibility checks with ${formatPercent(primary.probability)} model probability.`);
    if (completeOdds(odds))
        factors.push("Complete 1X2 market odds were available for probability normalization.");
    if (form.homeSampleSize || form.awaySampleSize)
        factors.push(`Recent-result samples parsed: home ${form.homeSampleSize}, away ${form.awaySampleSize}.`);
    if (expectedGoals.total !== null)
        factors.push(`Estimated combined expected goals are ${expectedGoals.total}.`);
    if (probabilities.over15 !== null)
        factors.push(`Over 1.5 model probability is ${formatPercent(probabilities.over15)}.`);
    if (probabilities.bttsYes !== null)
        factors.push(`GG Yes model probability is ${formatPercent(probabilities.bttsYes)}.`);
    if (stats.h2hMatches > 0)
        factors.push(`H2H sample includes ${stats.h2hMatches} completed non-current match${stats.h2hMatches === 1 ? "" : "es"}.`);
    if (inputs.standings?.homeTeamRow && inputs.standings.awayTeamRow)
        factors.push("Both teams were resolved in the standings table.");
    return uniqueStrings(factors);
}
function contradictionsFrom(probabilities, odds, stats, inputs, quality) {
    const contradictions = [];
    const recentSamples = summarizableMatches(inputs.recentResults?.home.matches ?? []).length + summarizableMatches(inputs.recentResults?.away.matches ?? []).length;
    if (recentSamples > 0 && recentSamples < 4)
        contradictions.push("Recent sample size is small.");
    if (!completeOdds(odds))
        contradictions.push("The 1X2 market is incomplete.");
    if (quality.dataQuality.score < 60)
        contradictions.push("Data quality is below the smart-card recommendation threshold.");
    if (stats.h2hOver25Rate !== null && averageDefined([stats.homeOver25Rate, stats.awayOver25Rate]) !== null) {
        const recentOver25 = averageDefined([stats.homeOver25Rate, stats.awayOver25Rate]) ?? 0;
        if (Math.abs(recentOver25 - stats.h2hOver25Rate) >= 0.35)
            contradictions.push("H2H goal trend disagrees with recent-form goal trend.");
    }
    if (probabilities.home !== null && probabilities.draw !== null && probabilities.away !== null) {
        const spread = Math.max(probabilities.home, probabilities.draw, probabilities.away) - Math.min(probabilities.home, probabilities.draw, probabilities.away);
        if (spread < 0.15)
            contradictions.push("Outcome probabilities are closely grouped.");
    }
    for (const warning of inputs.inputWarnings.slice(0, 2))
        contradictions.push(warning);
    return uniqueStrings(contradictions);
}
function unavailableQuickAnalysis(eventId, reason) {
    return {
        eventId,
        status: "UNKNOWN",
        mode: "UNAVAILABLE",
        decision: "UNAVAILABLE",
        primaryRecommendation: null,
        alternativeRecommendations: [],
        probabilities: emptyProbabilities(),
        expectedGoals: { home: null, away: null, total: null },
        form: { home: null, away: null, homeSampleSize: 0, awaySampleSize: 0 },
        stats: emptyStats(),
        dataQuality: { score: 0, label: "VERY_LOW" },
        confidence: { score: 0, label: "VERY_LOW" },
        risk: "VERY_HIGH",
        supportingFactors: [],
        contradictions: [],
        rejectionReasons: [reason],
        generatedAt: new Date().toISOString(),
    };
}
function emptyProbabilities() {
    return {
        home: null,
        draw: null,
        away: null,
        over15: null,
        under15: null,
        over25: null,
        under25: null,
        bttsYes: null,
        bttsNo: null,
    };
}
function emptyStats() {
    return {
        homeAverageScored: null,
        awayAverageScored: null,
        homeAverageConceded: null,
        awayAverageConceded: null,
        homeOver15Rate: null,
        awayOver15Rate: null,
        homeOver25Rate: null,
        awayOver25Rate: null,
        homeBttsRate: null,
        awayBttsRate: null,
        h2hMatches: 0,
        h2hOver15Rate: null,
        h2hOver25Rate: null,
        h2hBttsRate: null,
    };
}
function completeOdds(odds) {
    return Boolean(odds?.available && odds.home && odds.draw && odds.away);
}
function summarizableMatches(matches) {
    return matches.filter((match) => match.homeScore !== null && match.awayScore !== null);
}
function totalGoals(match) {
    return (match.homeScore ?? 0) + (match.awayScore ?? 0);
}
function bothTeamsScored(match) {
    return (match.homeScore ?? 0) > 0 && (match.awayScore ?? 0) > 0;
}
function rate(matches, predicate) {
    if (!matches.length)
        return null;
    return roundProbability(matches.filter(predicate).length / matches.length);
}
function averageFromTotal(total, count) {
    if (!count || typeof total !== "number" || !Number.isFinite(total))
        return null;
    return roundDecimal(total / count);
}
function averageDefined(values) {
    const safe = values.filter((value) => typeof value === "number" && Number.isFinite(value));
    if (!safe.length)
        return null;
    return roundDecimal(safe.reduce((sum, value) => sum + value, 0) / safe.length);
}
function weightedAverage(values) {
    let numerator = 0;
    let denominator = 0;
    for (const [value, weight] of values) {
        if (value === null || !Number.isFinite(value))
            continue;
        numerator += value * weight;
        denominator += weight;
    }
    return denominator ? roundProbability(numerator / denominator) : null;
}
function poissonOver(lambda, line) {
    const maxUnder = line === 1.5 ? 1 : 2;
    let under = 0;
    for (let goals = 0; goals <= maxUnder; goals += 1) {
        under += poissonProbability(lambda, goals);
    }
    return roundProbability(1 - under);
}
function poissonBtts(homeLambda, awayLambda) {
    return roundProbability((1 - Math.exp(-homeLambda)) * (1 - Math.exp(-awayLambda)));
}
function poissonProbability(lambda, goals) {
    return Math.exp(-lambda) * (lambda ** goals) / factorial(goals);
}
function factorial(value) {
    let result = 1;
    for (let index = 2; index <= value; index += 1)
        result *= index;
    return result;
}
function implied(odd) {
    return typeof odd === "number" && Number.isFinite(odd) && odd > 1 ? roundProbability(1 / odd) : null;
}
function sumProbabilities(values) {
    if (values.some((value) => value === null))
        return null;
    return roundProbability(values.reduce((sum, value) => sum + (value ?? 0), 0));
}
function compareRecommendations(left, right) {
    if (left.eligible !== right.eligible)
        return left.eligible ? -1 : 1;
    const leftEv = left.expectedValuePercent ?? Number.NEGATIVE_INFINITY;
    const rightEv = right.expectedValuePercent ?? Number.NEGATIVE_INFINITY;
    if (leftEv !== rightEv)
        return rightEv - leftEv;
    if (left.confidenceScore !== right.confidenceScore)
        return right.confidenceScore - left.confidenceScore;
    if (riskRank(left.risk) !== riskRank(right.risk))
        return riskRank(left.risk) - riskRank(right.risk);
    const leftProbability = left.probability ?? 0;
    const rightProbability = right.probability ?? 0;
    if (leftProbability !== rightProbability)
        return rightProbability - leftProbability;
    return marketPriority.indexOf(left.market) - marketPriority.indexOf(right.market);
}
function isContradictory(left, right) {
    const pair = new Set([left, right]);
    return ((pair.has("BTTS_YES") && pair.has("BTTS_NO")) ||
        (pair.has("OVER_2_5") && pair.has("UNDER_2_5")) ||
        (pair.has("OVER_1_5") && pair.has("UNDER_1_5")) ||
        (pair.has("HOME") && pair.has("AWAY")) ||
        (pair.has("HOME") && pair.has("DRAW_OR_AWAY")) ||
        (pair.has("AWAY") && pair.has("HOME_OR_DRAW")));
}
function riskFrom(dataQuality, confidence, warningCount) {
    if (dataQuality < 40 || confidence < 40 || warningCount > 2)
        return "VERY_HIGH";
    if (dataQuality < 60 || confidence < 60 || warningCount > 0)
        return "HIGH";
    if (confidence < 75)
        return "MEDIUM";
    return "LOW";
}
function riskRank(risk) {
    if (risk === "LOW")
        return 0;
    if (risk === "MEDIUM")
        return 1;
    if (risk === "HIGH")
        return 2;
    return 3;
}
function qualityLabel(score) {
    if (score < 30)
        return "VERY_LOW";
    if (score < 50)
        return "LOW";
    if (score < 70)
        return "MEDIUM";
    if (score < 85)
        return "HIGH";
    return "VERY_HIGH";
}
function roundProbability(value) {
    return Number.isFinite(value) ? Math.round(value * 10_000) / 10_000 : 0;
}
function roundDecimal(value) {
    return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}
function roundPercentagePoints(value) {
    return Number.isFinite(value) ? Math.round(value * 10_000) / 100 : 0;
}
function clamp(value) {
    return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}
function formatPercent(value) {
    return value === null ? "unavailable" : `${Math.round(value * 100)}%`;
}
function uniqueStrings(values) {
    return Array.from(new Set(values.filter(Boolean)));
}
async function runLimited(items, concurrency, worker) {
    const results = [];
    let next = 0;
    const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
        while (next < items.length) {
            const index = next;
            next += 1;
            const item = items[index];
            if (item === undefined)
                return;
            results[index] = await worker(item);
        }
    });
    await Promise.all(workers);
    return results;
}
function errorMessage(error) {
    return error instanceof Error ? error.message : "Analysis unavailable";
}
//# sourceMappingURL=quick-analysis.service.js.map