/**
 * Pure helpers for the /api/insights route: payload shape, deterministic
 * mock generation (no API key needed), tolerant JSON extraction, and
 * response-shape validation. Kept framework-free so they're unit-testable.
 */

import type {
  AboutState,
  AdvisorInsights,
  BenefitsState,
  GoalsState,
  PriorityKey,
} from "@/types";
import { detectBenefitGaps, PRIORITY_LABELS } from "@/lib/profile";

export interface InsightsResultsPayload {
  years: number;
  projected: number;
  needed: number;
  percent: number;
  band: string;
  gap: number;
  extraMonthlyToClose: number;
  sustainableMonthlyIncome: number;
  netNeedAtRetirementMonthly: number;
}

export interface InsightsAssetsSummary {
  totalCurrentBalance: number;
  totalMonthlyContribution: number;
  annualEmployerMatch: number;
  accountTypes: string[];
}

export interface InsightsPayload {
  about: AboutState;
  benefits: Partial<BenefitsState>;
  goals: GoalsState;
  assetsSummary: InsightsAssetsSummary;
  results: InsightsResultsPayload;
}

const usd = (n: number) =>
  `$${Math.round(n).toLocaleString("en-US")}`;

/** Deterministic mock insights so local dev works without an API key. */
export function buildMockInsights(payload: InsightsPayload): AdvisorInsights {
  const { about, benefits, goals, results } = payload;
  const gaps = detectBenefitGaps(benefits).slice(0, 5);
  const priorities = (goals.priorities || [])
    .map((p: PriorityKey) => PRIORITY_LABELS[p])
    .filter(Boolean);

  const bandPhrase =
    results.band === "on-track"
      ? "you're projected to meet your goal — a strong position to build from"
      : results.band === "getting-close"
        ? "you're getting close to your goal, and a few focused moves could close the remaining gap"
        : "there's a meaningful gap between your projected savings and your goal, but you have clear options";

  const fedPhrase =
    about.federalStatus === "yes"
      ? `As a current federal employee${about.agency ? ` at ${about.agency}` : ""}${
          about.yearsOfService ? ` with ${about.yearsOfService} years of service` : ""
        }, you have access to one of the strongest benefits packages in the country.`
      : about.federalStatus === "retired-military"
        ? "As retired military, you bring earned benefits into your plan that many people don't have — and coordinating them well matters."
        : "Even outside federal service, the fundamentals of your plan are the same: consistent saving, protected income, and a clear goal.";

  const summary = `At age ${about.currentAge}, planning to retire at ${about.retirementAge}, ${bandPhrase}. Your projected savings of ${usd(
    results.projected
  )} compare with an estimated need of ${usd(results.needed)} (${Math.round(results.percent)}% of goal). ${fedPhrase}`;

  const goalBits: string[] = [];
  if (priorities.length > 0) {
    goalBits.push(
      `You told us what matters most is ${priorities.join(", ").toLowerCase()} — keep those front and center when weighing trade-offs.`
    );
  }
  if (goals.idealRetirement.trim()) {
    goalBits.push(
      `Your picture of an ideal retirement — "${goals.idealRetirement.trim().slice(0, 160)}" — is exactly the kind of concrete vision that makes a plan stick.`
    );
  }
  if (goals.biggestWorry.trim()) {
    goalBits.push(
      `You named your biggest worry as "${goals.biggestWorry.trim().slice(0, 160)}". The best answer to worry is a written plan: your ${usd(
        goals.monthlySpend
      )}/month spending target and ${Math.round(results.percent)}% readiness give us a concrete starting point.`
    );
  }
  if (goalBits.length === 0) {
    goalBits.push(
      `Your ${usd(goals.monthlySpend)}/month spending target translates to a nest egg of about ${usd(
        results.needed
      )}. You're currently projected to reach ${Math.round(results.percent)}% of that — a clear, measurable goal to work toward.`
    );
  }

  const actionSteps: { step: string; why: string }[] = [];
  if (gaps.length > 0) {
    actionSteps.push({
      step: `Review your ${gaps[0].title.toLowerCase().includes("tsp") ? "TSP contribution rate" : "benefits engagement"} first`,
      why: gaps[0].detail,
    });
  }
  if (results.gap > 0 && Number.isFinite(results.extraMonthlyToClose)) {
    actionSteps.push({
      step: `Work toward saving about ${usd(results.extraMonthlyToClose)} more per month`,
      why: `That's the estimated extra monthly contribution needed to close your ${usd(results.gap)} gap by age ${about.retirementAge}.`,
    });
  }
  actionSteps.push({
    step: "Confirm your income-protection coverage (disability and long-term care)",
    why: "Your retirement plan depends on uninterrupted income today. Protection gaps are the quiet risk that derails otherwise solid plans.",
  });
  actionSteps.push({
    step: "Schedule a free benefits review with a United Benefits advisor",
    why: "A 30-minute conversation can verify your federal benefits elections and turn these estimates into a personalized written strategy.",
  });

  return {
    mock: true,
    summary,
    benefitGaps: gaps.map(({ title, detail }) => ({ title, detail })),
    goalAlignment: goalBits.join(" "),
    actionSteps: actionSteps.slice(0, 5),
    encouragement:
      results.band === "on-track"
        ? "You've done the hard part — building the habit. Stay the course, and let us help you protect what you've built."
        : "The fact that you're planning now puts you ahead of most people. Small, consistent steps from here can change your entire retirement picture.",
  };
}

/** Tolerant JSON extractor: strips code fences, grabs first { to last }. */
export function extractJson(text: string): unknown {
  let t = text.trim();
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model output");
  }
  return JSON.parse(t.slice(start, end + 1));
}

/** Validate the AdvisorInsights shape. */
export function isAdvisorInsights(value: unknown): value is AdvisorInsights {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.summary !== "string") return false;
  if (typeof v.goalAlignment !== "string") return false;
  if (typeof v.encouragement !== "string") return false;
  if (
    !Array.isArray(v.benefitGaps) ||
    !v.benefitGaps.every(
      (g) =>
        typeof g === "object" &&
        g !== null &&
        typeof (g as Record<string, unknown>).title === "string" &&
        typeof (g as Record<string, unknown>).detail === "string"
    )
  ) {
    return false;
  }
  if (
    !Array.isArray(v.actionSteps) ||
    !v.actionSteps.every(
      (s) =>
        typeof s === "object" &&
        s !== null &&
        typeof (s as Record<string, unknown>).step === "string" &&
        typeof (s as Record<string, unknown>).why === "string"
    )
  ) {
    return false;
  }
  return true;
}
