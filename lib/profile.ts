/**
 * Pure helpers for mapping wizard state into calc inputs and for
 * benefits-engagement metadata shared by the UI, mock insights, and PDF.
 */

import type {
  AboutState,
  BenefitKey,
  BenefitsState,
  BenefitSelection,
  GoalsState,
  PriorityKey,
  VisionState,
} from "@/types";

/** Map AboutState + GoalsState into the calc input type. calc.ts stays untouched. */
export function toVisionState(about: AboutState, goals: GoalsState): VisionState {
  return {
    currentAge: about.currentAge,
    retirementAge: about.retirementAge,
    lifestyle: goals.lifestyle,
    monthlySpend: goals.monthlySpend,
    homePaidOff: goals.homePaidOff,
    monthlyHousing: goals.monthlyHousing,
    monthlySocialSecurity: goals.monthlySocialSecurity,
  };
}

export const BENEFIT_LABELS: Record<BenefitKey, string> = {
  tsp: "TSP (Thrift Savings Plan)",
  pension: "FERS/CSRS pension",
  fehb: "FEHB (health insurance)",
  fegli: "FEGLI (life insurance)",
  disability: "Disability insurance",
  "long-term-care": "Long-term care insurance",
  fedvip: "Dental & Vision (FEDVIP)",
  "hsa-fsa": "HSA / FSA",
};

export const BENEFIT_ORDER: BenefitKey[] = [
  "tsp",
  "pension",
  "fehb",
  "fegli",
  "disability",
  "long-term-care",
  "fedvip",
  "hsa-fsa",
];

export function initialBenefitsState(): BenefitsState {
  return BENEFIT_ORDER.reduce((acc, key) => {
    acc[key] = { key, status: null };
    return acc;
  }, {} as BenefitsState);
}

export const PRIORITY_LABELS: Record<PriorityKey, string> = {
  travel: "Travel",
  family: "Family time",
  healthcare: "Healthcare security",
  inheritance: "Leaving an inheritance",
  hobbies: "Hobbies & recreation",
  giving: "Giving/charity",
  "part-time-work": "Part-time work or business",
  "peace-of-mind": "Peace of mind",
};

export interface BenefitGap {
  key: BenefitKey;
  title: string;
  detail: string;
}

/**
 * Deterministic benefit-gap detection used by the mock insights response
 * (and testable independently). Prioritizes the TSP match, disability, and
 * long-term care, then any remaining not-using/unsure benefits.
 */
export function detectBenefitGaps(benefits: Partial<BenefitsState>): BenefitGap[] {
  const gaps: BenefitGap[] = [];
  const get = (key: BenefitKey): BenefitSelection | undefined => benefits[key];

  const tsp = get("tsp");
  if (tsp?.status === "using" && tsp.tspFullMatch && tsp.tspFullMatch !== "yes") {
    gaps.push({
      key: "tsp",
      title:
        tsp.tspFullMatch === "no"
          ? "You may be leaving free TSP match money on the table"
          : "Check whether you're getting the full TSP match",
      detail:
        "FERS employees who contribute at least 5% of salary receive the full 5% government match. Contributing below that threshold means walking away from guaranteed money every pay period.",
    });
  } else if (tsp && tsp.status !== "using" && tsp.status !== null) {
    gaps.push({
      key: "tsp",
      title:
        tsp.status === "not-using"
          ? "You're not using the TSP — your most powerful retirement tool"
          : "You're not sure about your TSP status",
      detail:
        "The Thrift Savings Plan offers some of the lowest-cost funds available anywhere, plus up to a 5% government match for FERS employees. It's usually the first place a federal employee should save.",
    });
  }

  const priorityKeys: BenefitKey[] = ["disability", "long-term-care"];
  const detailByKey: Partial<Record<BenefitKey, string>> = {
    disability:
      "An income-protection gap is one of the most common — and most serious — risks we see. If illness or injury interrupted your paycheck, disability coverage keeps your household (and your retirement contributions) on track.",
    "long-term-care":
      "Roughly 7 in 10 people over 65 will need some form of long-term care, and neither FEHB nor Medicare covers most of it. Planning for this early keeps the cost manageable.",
    pension:
      "Understanding your FERS/CSRS pension is essential — it may be the largest single income source in your retirement plan.",
    fehb:
      "FEHB can usually be carried into retirement if you meet the 5-year rule — one of the most valuable federal benefits there is. Make sure you're positioned to keep it.",
    fegli:
      "FEGLI premiums rise steeply with age. Reviewing your life insurance now can protect your family at a far lower long-term cost.",
    fedvip:
      "FEDVIP dental and vision coverage is inexpensive and can continue into retirement — an easy win many federal employees overlook.",
    "hsa-fsa":
      "An HSA offers triple tax advantages and can double as a retirement healthcare fund; an FSA reduces taxes on predictable expenses.",
  };

  const remaining = BENEFIT_ORDER.filter((k) => k !== "tsp").sort((a, b) => {
    const pa = priorityKeys.indexOf(a);
    const pb = priorityKeys.indexOf(b);
    return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
  });

  for (const key of remaining) {
    const sel = get(key);
    if (!sel || sel.status === "using" || sel.status === null) continue;
    const label = BENEFIT_LABELS[key];
    gaps.push({
      key,
      title:
        sel.status === "not-using"
          ? `You're not currently using ${label}`
          : `You're not sure where you stand with ${label}`,
      detail: detailByKey[key] ?? `A quick review of ${label} could uncover value you're entitled to but not using.`,
    });
  }

  return gaps;
}
