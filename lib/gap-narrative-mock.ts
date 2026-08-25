/**
 * Deterministic mock narrative builder for /api/ai/gap-narrative — kept in
 * lib so it's unit-testable and doesn't violate Next.js route-export rules.
 */

import type { GapNarrativeResponse } from "@/types/federal";

export interface GapNarrativePayload {
  currentAge?: number;
  retirementAge?: number;
  salary?: number;
  targetMonthly?: number;
  totalMonthly?: number;
  gapMonthly?: number;
  pensionMonthly?: number;
  supplementMonthly?: number;
  ssMonthly?: number;
  tspMonthly?: number;
  tspContributionPercent?: number;
  missedMatchAnnual?: number;
  fegliEnrollment?: string;
  fegliAnnualCost?: number;
  privateTermAnnualCost?: number;
  disabilityCareerEarnings?: number;
  underinsuredShortfall?: number;
  replacementPercent?: number;
}

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** Deterministic mock so local dev works without an API key. */
export function buildMockGapNarrative(p: GapNarrativePayload): GapNarrativeResponse {
  const gap = p.gapMonthly ?? 0;
  const hasGap = gap > 0;

  const gapNarrative = hasGap
    ? `Your target retirement income is ${usd(p.targetMonthly ?? 0)}/month, and your projected income is ${usd(p.totalMonthly ?? 0)}/month — a shortfall of ${usd(gap)}/month. That gap is closeable: working a little longer, increasing your TSP contribution, or adjusting your target can each move the needle. Small changes made now compound meaningfully by retirement. A United Benefits advisor can help you find the right combination.`
    : `Great news: your projected retirement income of ${usd(p.totalMonthly ?? 0)}/month meets or exceeds your target of ${usd(p.targetMonthly ?? 0)}/month. Your FERS pension, Social Security, and TSP work together to cover your goal. Staying the course and protecting what you've built are now the priorities. An advisor can help you stress-test the plan.`;

  const riskParts: string[] = [];
  if (p.fegliEnrollment && p.fegliEnrollment !== "none") {
    riskParts.push(
      `You're currently enrolled in FEGLI (${p.fegliEnrollment})${p.fegliAnnualCost ? ` at roughly ${usd(p.fegliAnnualCost)}/year` : ""}. FEGLI premiums rise sharply at ages 45, 50, 55, 60, and 65, so comparing against level private term coverage${p.privateTermAnnualCost ? ` (estimated ${usd(p.privateTermAnnualCost)}/year)` : ""} is worth doing before your next age band.`
    );
  } else {
    riskParts.push(
      `You have no FEGLI coverage on record. If anyone depends on your income, a term life policy is usually the most affordable way to protect them.`
    );
  }
  if (p.disabilityCareerEarnings) {
    riskParts.push(
      `Your income is your biggest asset: an estimated ${usd(p.disabilityCareerEarnings)} in career earnings remains before retirement, and federal benefits do not include disability insurance — a private policy can protect that income.`
    );
  }
  if (p.underinsuredShortfall && p.underinsuredShortfall > 0) {
    riskParts.push(
      `Your total death benefit is about ${usd(p.underinsuredShortfall)} below the commonly recommended 10× income level.`
    );
  }
  const riskNarrative = riskParts.join(" ");

  const recs: { title: string; detail: string }[] = [];
  if ((p.missedMatchAnnual ?? 0) > 0) {
    recs.push({
      title: "Capture the full TSP match",
      detail: `Raising your contribution to 5% captures ${usd(p.missedMatchAnnual!)}/year in free agency match.`,
    });
  }
  if (hasGap) {
    recs.push({
      title: "Close your income gap",
      detail: `Your projected shortfall is ${usd(gap)}/month. Working longer, saving more in TSP, or adjusting your target can close it — try the sliders to see each lever.`,
    });
  }
  recs.push({
    title: "Review FEGLI vs. private term",
    detail:
      "FEGLI costs climb steeply with age. A side-by-side comparison with level private term coverage often saves thousands over 20 years.",
  });
  recs.push({
    title: "Protect your income against disability",
    detail:
      "Federal benefits don't include disability insurance. Ask your advisor about private disability coverage options.",
  });
  if (!hasGap) {
    recs.push({
      title: "Stress-test your plan",
      detail:
        "You're on track — review inflation, market-return, and longevity assumptions with an advisor to keep it that way.",
    });
  }

  return {
    gapNarrative,
    riskNarrative,
    topRecommendations: recs.slice(0, 3),
    mock: true,
  };
}
