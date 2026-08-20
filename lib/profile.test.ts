import { describe, it, expect } from "vitest";
import {
  toVisionState,
  detectBenefitGaps,
  initialBenefitsState,
  BENEFIT_ORDER,
} from "@/lib/profile";
import { buildMockInsights, extractJson, isAdvisorInsights } from "@/lib/insights";
import type { AboutState, GoalsState, BenefitsState } from "@/types";

const about: AboutState = {
  currentAge: 40,
  retirementAge: 65,
  maritalStatus: "married",
  federalStatus: "yes",
  agency: "USPS",
  yearsOfService: 12,
};

const goals: GoalsState = {
  lifestyle: "comfortable",
  monthlySpend: 6500,
  homePaidOff: false,
  monthlyHousing: 1500,
  monthlySocialSecurity: 2000,
  idealRetirement: "Travel with my wife and see the grandkids.",
  biggestWorry: "Healthcare costs.",
  priorities: ["travel", "family", "healthcare"],
};

function benefitsWith(overrides: Partial<BenefitsState> = {}): BenefitsState {
  return { ...initialBenefitsState(), ...overrides };
}

describe("toVisionState", () => {
  it("maps About + Goals into the calc VisionState shape", () => {
    const v = toVisionState(about, goals);
    expect(v).toEqual({
      currentAge: 40,
      retirementAge: 65,
      lifestyle: "comfortable",
      monthlySpend: 6500,
      homePaidOff: false,
      monthlyHousing: 1500,
      monthlySocialSecurity: 2000,
    });
  });
});

describe("initialBenefitsState", () => {
  it("creates an entry for every benefit with null status", () => {
    const b = initialBenefitsState();
    expect(Object.keys(b)).toHaveLength(BENEFIT_ORDER.length);
    for (const key of BENEFIT_ORDER) {
      expect(b[key]).toEqual({ key, status: null });
    }
  });
});

describe("detectBenefitGaps", () => {
  it("returns no gaps when everything is in use with full TSP match", () => {
    const b = initialBenefitsState();
    for (const key of BENEFIT_ORDER) b[key] = { key, status: "using" };
    b.tsp.tspFullMatch = "yes";
    expect(detectBenefitGaps(b)).toEqual([]);
  });

  it("flags TSP when using but not getting the full match", () => {
    const b = benefitsWith({ tsp: { key: "tsp", status: "using", tspFullMatch: "no" } });
    const gaps = detectBenefitGaps(b);
    expect(gaps[0].key).toBe("tsp");
    expect(gaps[0].title.toLowerCase()).toContain("match");
  });

  it("flags TSP when not using it at all", () => {
    const b = benefitsWith({ tsp: { key: "tsp", status: "not-using" } });
    const gaps = detectBenefitGaps(b);
    expect(gaps.some((g) => g.key === "tsp")).toBe(true);
  });

  it("prioritizes disability and long-term care ahead of other gaps", () => {
    const b = initialBenefitsState();
    for (const key of BENEFIT_ORDER) b[key] = { key, status: "not-using" };
    b.tsp = { key: "tsp", status: "using", tspFullMatch: "yes" };
    const gaps = detectBenefitGaps(b);
    expect(gaps[0].key).toBe("disability");
    expect(gaps[1].key).toBe("long-term-care");
  });

  it("ignores unanswered (null) benefits", () => {
    const b = benefitsWith({
      disability: { key: "disability", status: "unsure" },
    });
    const gaps = detectBenefitGaps(b);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].key).toBe("disability");
  });
});

describe("buildMockInsights", () => {
  const payload = {
    about,
    benefits: benefitsWith({
      tsp: { key: "tsp" as const, status: "using" as const, tspFullMatch: "no" as const },
      disability: { key: "disability" as const, status: "not-using" as const },
    }),
    goals,
    assetsSummary: {
      totalCurrentBalance: 150000,
      totalMonthlyContribution: 800,
      annualEmployerMatch: 3000,
      accountTypes: ["401(k) / TSP"],
    },
    results: {
      years: 25,
      projected: 900000,
      needed: 1200000,
      percent: 75,
      band: "getting-close",
      gap: 300000,
      extraMonthlyToClose: 370,
      sustainableMonthlyIncome: 3000,
      netNeedAtRetirementMonthly: 11000,
    },
  };

  it("is deterministic and flagged as mock", () => {
    const a = buildMockInsights(payload);
    const b = buildMockInsights(payload);
    expect(a).toEqual(b);
    expect(a.mock).toBe(true);
  });

  it("passes shape validation and references gaps + goals text", () => {
    const m = buildMockInsights(payload);
    expect(isAdvisorInsights(m)).toBe(true);
    expect(m.benefitGaps.length).toBeGreaterThanOrEqual(2);
    expect(m.goalAlignment).toContain("grandkids");
    expect(m.goalAlignment).toContain("Healthcare costs");
    expect(m.actionSteps.length).toBeGreaterThanOrEqual(3);
    expect(m.actionSteps.length).toBeLessThanOrEqual(5);
  });

  it("includes the extra-monthly figure when there is a gap", () => {
    const m = buildMockInsights(payload);
    expect(m.actionSteps.some((s) => s.step.includes("$370"))).toBe(true);
  });
});

describe("extractJson", () => {
  it("parses plain JSON", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips markdown code fences", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("extracts JSON surrounded by prose", () => {
    expect(extractJson('Here you go:\n{"a": {"b": 2}}\nHope that helps!')).toEqual({
      a: { b: 2 },
    });
  });

  it("throws when no JSON object is present", () => {
    expect(() => extractJson("no json here")).toThrow();
  });
});

describe("isAdvisorInsights", () => {
  const valid = {
    summary: "s",
    benefitGaps: [{ title: "t", detail: "d" }],
    goalAlignment: "g",
    actionSteps: [{ step: "s", why: "w" }],
    encouragement: "e",
  };

  it("accepts a valid shape", () => {
    expect(isAdvisorInsights(valid)).toBe(true);
  });

  it("accepts empty arrays", () => {
    expect(isAdvisorInsights({ ...valid, benefitGaps: [], actionSteps: [] })).toBe(true);
  });

  it("rejects missing fields and malformed arrays", () => {
    expect(isAdvisorInsights(null)).toBe(false);
    expect(isAdvisorInsights({ ...valid, summary: 1 })).toBe(false);
    expect(isAdvisorInsights({ ...valid, benefitGaps: [{ title: "t" }] })).toBe(false);
    expect(isAdvisorInsights({ ...valid, actionSteps: [{ step: "s" }] })).toBe(false);
  });
});
