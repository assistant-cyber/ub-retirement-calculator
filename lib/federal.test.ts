/**
 * Phase-A federal engine tests: FERS calculations, FEGLI rates, TSP
 * projections, SS approximation, and the gap-analysis engine.
 */

import { describe, it, expect } from "vitest";
import {
  mraForBirthYear,
  mraLabel,
  yearsOfService,
  ageAt,
  eligibilityScenarios,
  high3,
  fersPension,
  fersSupplement,
  applyCola,
  isEligibleForSupplement,
  isEligibleForSS,
  ssEstimateApprox,
} from "@/lib/fers-calculations";
import {
  basicCoverage,
  fegliAnnualCost,
  fegliCostOverYears,
  fegliCoverageAmount,
  privateTermEstimate,
  twentyYearComparison,
  underinsuredCheck,
} from "@/lib/fegli-rates";
import {
  agencyMatch,
  missedMatch,
  missedMatchFutureValue,
  projectTSP,
  tspMonthlyIncome,
  disabilityGap,
} from "@/lib/tsp-projections";
import { computeIncomeBreakdown, age57Snapshot } from "@/lib/gap-analysis";
import { buildMockGapNarrative } from "@/lib/gap-narrative-mock";
import type { GapAnalysisInputs } from "@/types/federal";

// ---------------------------------------------------------------------------
// MRA table
// ---------------------------------------------------------------------------

describe("mraForBirthYear", () => {
  it("born 1969 → 56 and 10 months", () => {
    expect(mraForBirthYear(1969)).toBeCloseTo(56 + 10 / 12, 10);
    expect(mraLabel(1969)).toBe("56 and 10 months");
  });

  it("born 1970 → 57", () => {
    expect(mraForBirthYear(1970)).toBe(57);
    expect(mraLabel(1970)).toBe("57");
  });

  it("born 1955 → 56", () => {
    expect(mraForBirthYear(1955)).toBe(56);
  });

  it("born 1948 → 55 and 2 months", () => {
    expect(mraForBirthYear(1948)).toBeCloseTo(55 + 2 / 12, 10);
    expect(mraLabel(1948)).toBe("55 and 2 months");
  });

  it("born 1947 → 55; born 1990 → 57; born 1965 → 56 and 2 months", () => {
    expect(mraForBirthYear(1947)).toBe(55);
    expect(mraForBirthYear(1990)).toBe(57);
    expect(mraForBirthYear(1965)).toBeCloseTo(56 + 2 / 12, 10);
  });
});

// ---------------------------------------------------------------------------
// Service / age
// ---------------------------------------------------------------------------

describe("yearsOfService / ageAt", () => {
  it("computes day-accurate decimal years", () => {
    expect(yearsOfService("2010-01-01", "2020-01-01")).toBeCloseTo(10, 1);
    expect(ageAt("1980-06-15", "2020-06-15")).toBeCloseTo(40, 1);
  });

  it("clamps negative service to 0", () => {
    expect(yearsOfService("2030-01-01", "2020-01-01")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Eligibility
// ---------------------------------------------------------------------------

describe("eligibilityScenarios", () => {
  it("dob 1990-01-01, scd 2015-01-01 → MRA+30 earliest at 2047 (age 57)", () => {
    const scenarios = eligibilityScenarios(
      "1990-01-01",
      "2015-01-01",
      0,
      "2026-08-25"
    );
    const mra30 = scenarios.find((s) => s.rule === "MRA+30")!;
    const sixtyTwo = scenarios.find((s) => s.rule === "62+5")!;
    const sixty20 = scenarios.find((s) => s.rule === "60+20")!;

    // MRA (57) reached in 2047; 30 yrs of service already reached in 2045 →
    // eligible on 57th birthday in 2047 with ~32 yrs of service.
    expect(mra30.eligibleDate.startsWith("2047")).toBe(true);
    expect(mra30.ageAtDate).toBeCloseTo(57, 1);
    expect(mra30.serviceAtDate).toBeGreaterThan(31);
    expect(mra30.earliest).toBe(true);
    expect(mra30.yearsUntil).toBeGreaterThan(20);

    // 62+5 also applies (2052) but is not earliest
    expect(sixtyTwo.applies).toBe(true);
    expect(sixtyTwo.eligibleDate.startsWith("2052")).toBe(true);
    expect(sixtyTwo.earliest).toBe(false);
    expect(sixty20.eligibleDate.startsWith("2050")).toBe(true);
  });

  it("military deposit years accelerate service requirement", () => {
    const withMil = eligibilityScenarios("1990-01-01", "2020-01-01", 5, "2026-08-25");
    const withoutMil = eligibilityScenarios("1990-01-01", "2020-01-01", 0, "2026-08-25");
    const m = withMil.find((s) => s.rule === "MRA+30")!;
    const n = withoutMil.find((s) => s.rule === "MRA+30")!;
    expect(new Date(m.eligibleDate).getTime()).toBeLessThanOrEqual(
      new Date(n.eligibleDate).getTime()
    );
  });

  it("already-eligible person shows yearsUntil = 0", () => {
    const scenarios = eligibilityScenarios("1955-01-01", "1980-01-01", 0, "2026-08-25");
    const earliest = scenarios.find((s) => s.earliest)!;
    expect(earliest.yearsUntil).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// High-3 / pension / supplement / COLA
// ---------------------------------------------------------------------------

describe("high3", () => {
  it("salary 100000, retiring in 10 yrs @2% → ≈ $117,166 (±1%)", () => {
    const result = high3(100_000, 10, 0.02);
    const expected =
      (100_000 * (Math.pow(1.02, 7) + Math.pow(1.02, 8) + Math.pow(1.02, 9))) / 3;
    expect(result).toBeCloseTo(expected, 6);
    expect(result).toBeGreaterThan(117_166 * 0.99);
    expect(result).toBeLessThan(117_166 * 1.01);
  });

  it("retiring now (0 years out) → roughly current salary", () => {
    expect(high3(100_000, 0, 0.02)).toBeCloseTo(100_000, -2);
  });
});

describe("fersPension", () => {
  it("high3 100000, 30 yrs, retire 60 → 30000/yr @1.0%", () => {
    const p = fersPension(100_000, 30, 60);
    expect(p.multiplier).toBe(0.01);
    expect(p.annual).toBeCloseTo(30_000, 6);
    expect(p.monthly).toBeCloseTo(2_500, 6);
  });

  it("high3 100000, 20 yrs, retire 62 → 22000/yr @1.1%", () => {
    const p = fersPension(100_000, 20, 62);
    expect(p.multiplier).toBe(0.011);
    expect(p.annual).toBeCloseTo(22_000, 6);
  });

  it("62 with only 19 yrs stays at 1.0%", () => {
    expect(fersPension(100_000, 19, 62).multiplier).toBe(0.01);
  });
});

describe("fersSupplement", () => {
  it("30 yrs FERS, ss62 = 2000 → 1500/mo", () => {
    const s = fersSupplement(30, 2000);
    expect(s.monthly).toBeCloseTo(1500, 6);
    expect(s.annual).toBeCloseTo(18_000, 6);
  });
});

describe("applyCola / system flags", () => {
  it("compounds COLA", () => {
    expect(applyCola(1000, 0.02, 10)).toBeCloseTo(1000 * Math.pow(1.02, 10), 6);
    expect(applyCola(1000, 0.02, 0)).toBe(1000);
  });

  it("CSRS gets no supplement and no SS", () => {
    expect(isEligibleForSupplement("CSRS")).toBe(false);
    expect(isEligibleForSupplement("FERS")).toBe(true);
    expect(isEligibleForSS("CSRS", "yes")).toBe(false);
    expect(isEligibleForSS("FERS", "yes")).toBe(true);
    expect(isEligibleForSS("FERS", "no")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// SS bend-point approximation
// ---------------------------------------------------------------------------

describe("ssEstimateApprox", () => {
  it("salary 100000, full career → PIA ≈ $2,900–3,200/mo at FRA", () => {
    const est = ssEstimateApprox(100_000, 40, 15, 35);
    expect(est.atFRA).toBeGreaterThanOrEqual(2_900);
    expect(est.atFRA).toBeLessThanOrEqual(3_200);
    expect(est.at62).toBe(Math.round(est.pia * 0.7));
    expect(est.at70).toBe(Math.round(est.pia * 1.24));
    expect(est.fra).toBe(67);
    expect(est.at62).toBeLessThan(est.atFRA);
    expect(est.at70).toBeGreaterThan(est.atFRA);
  });

  it("caps salary at the taxable maximum", () => {
    const capped = ssEstimateApprox(500_000, 40, 15, 35);
    const atCap = ssEstimateApprox(168_600, 40, 15, 35);
    expect(capped.atFRA).toBe(atCap.atFRA);
  });

  it("scales down short careers", () => {
    const short = ssEstimateApprox(100_000, 40, 5, 17.5);
    const full = ssEstimateApprox(100_000, 40, 15, 35);
    expect(short.atFRA).toBeLessThan(full.atFRA);
  });
});

// ---------------------------------------------------------------------------
// FEGLI
// ---------------------------------------------------------------------------

describe("FEGLI rates", () => {
  it("basic for salary 87000 → coverage 90000, annual $374.40", () => {
    expect(basicCoverage(87_000)).toBe(90_000);
    const annual = fegliAnnualCost({ enrollment: "basic", optionBMultiple: 1 }, 40, 87_000);
    expect(annual).toBeCloseTo(90 * 0.16 * 26, 2); // $374.40
    expect(annual).toBeCloseTo(374.4, 2);
  });

  it("enrollment none costs nothing and covers nothing", () => {
    const profile = { enrollment: "none" as const, optionBMultiple: 1 as const };
    expect(fegliAnnualCost(profile, 50, 100_000)).toBe(0);
    expect(fegliCoverageAmount(profile, 100_000)).toBe(0);
  });

  it("Option B premiums jump across age bands", () => {
    const profile = { enrollment: "basic-b" as const, optionBMultiple: 5 as const };
    const points = fegliCostOverYears(profile, 43, 100_000, 25); // ages 43–67
    const at44 = points.find((p) => p.age === 44)!.annualCost;
    const at45 = points.find((p) => p.age === 45)!.annualCost;
    const at60 = points.find((p) => p.age === 60)!.annualCost;
    expect(at45).toBeGreaterThan(at44);
    expect(at60).toBeGreaterThan(at45 * 2); // dramatic increase at 60+
  });

  it("twentyYearComparison: FEGLI B costs more than level private term at 45", () => {
    const profile = { enrollment: "basic-b" as const, optionBMultiple: 5 as const };
    const cmp = twentyYearComparison(profile, 45, 100_000);
    expect(cmp.coverageAmount).toBe(103_000 + 505_000); // basic 103k + 5×101k (salary rounded up)
    expect(cmp.fegliTotal).toBeGreaterThan(0);
    expect(cmp.privateTotal).toBeGreaterThan(0);
    expect(cmp.fegliTotal).toBeGreaterThan(cmp.privateTotal);
  });

  it("privateTermEstimate uses issue-age band", () => {
    expect(privateTermEstimate(30, 500_000)).toBeCloseTo(300, 6); // 0.60/1k
    expect(privateTermEstimate(50, 500_000)).toBeCloseTo(1300, 6); // 2.60/1k
  });

  it("underinsuredCheck flags below 10× income", () => {
    const under = underinsuredCheck(500_000, 100_000);
    expect(under.insured).toBe(false);
    expect(under.recommended).toBe(1_000_000);
    expect(under.shortfall).toBe(500_000);

    const ok = underinsuredCheck(1_200_000, 100_000);
    expect(ok.insured).toBe(true);
    expect(ok.shortfall).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// TSP
// ---------------------------------------------------------------------------

describe("TSP agency match", () => {
  it("salary 100000 @5% → 5000", () => {
    expect(agencyMatch(100_000, 5)).toBeCloseTo(5_000, 6);
  });

  it("@3% → 4000 (1000 auto + 3000 dollar-for-dollar)", () => {
    expect(agencyMatch(100_000, 3)).toBeCloseTo(4_000, 6);
  });

  it("@0% → 1000 (auto only); @4% → 4500", () => {
    expect(agencyMatch(100_000, 0)).toBeCloseTo(1_000, 6);
    expect(agencyMatch(100_000, 4)).toBeCloseTo(4_500, 6);
  });

  it("caps at 5% — contributing 10% still gets 5% agency", () => {
    expect(agencyMatch(100_000, 10)).toBeCloseTo(5_000, 6);
  });

  it("missedMatch @0% = 4000; @5% = 0", () => {
    expect(missedMatch(100_000, 0)).toBeCloseTo(4_000, 6);
    expect(missedMatch(100_000, 5)).toBe(0);
  });

  it("missedMatchFutureValue grows the missed match", () => {
    const fv = missedMatchFutureValue(100_000, 0, 20, 0.06);
    // 4000/yr ≈ 333.33/mo for 20 yrs at 6% ≈ $154k
    expect(fv).toBeGreaterThan(140_000);
    expect(fv).toBeLessThan(170_000);
    expect(missedMatchFutureValue(100_000, 5, 20)).toBe(0);
  });
});

describe("projectTSP", () => {
  it("returns year-by-year points with growing balance", () => {
    const pts = projectTSP(50_000, 100_000, "percent", 5, 0.06, 10, 0.02, 40);
    expect(pts).toHaveLength(11);
    expect(pts[0]).toMatchObject({ year: 0, balance: 50_000, age: 40 });
    expect(pts[10].age).toBe(50);
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i].balance).toBeGreaterThan(pts[i - 1].balance);
    }
    // Sanity: 50k lump at 6% ≈ 91k, plus ~10k/yr contributions+match growing → > 210k
    expect(pts[10].balance).toBeGreaterThan(210_000);
    expect(pts[10].balance).toBeLessThan(300_000);
  });

  it("dollar mode contributes flat amounts and still earns match", () => {
    const pts = projectTSP(0, 100_000, "dollar", 5_000, 0.06, 1, 0);
    // 5000 employee (5% effective) + 5000 match = 10000/yr
    expect(pts[1].balance).toBeGreaterThan(10_000);
  });

  it("zero years returns just the starting point", () => {
    expect(projectTSP(10_000, 100_000, "percent", 5, 0.06, 0)).toHaveLength(1);
  });
});

describe("tspMonthlyIncome / disabilityGap", () => {
  it("4% rule: 600k → 2000/mo", () => {
    expect(tspMonthlyIncome(600_000)).toBeCloseTo(2_000, 6);
  });

  it("disabilityGap sums salary growth to MRA and estimates FERS disability", () => {
    const g = disabilityGap(100_000, 47, 57);
    expect(g.yearsToMra).toBe(10);
    // Sum of 100k × 1.02^k for k=0..9 ≈ $1,094,972
    expect(g.careerEarningsRemaining).toBeGreaterThan(1_000_000);
    expect(g.careerEarningsRemaining).toBeLessThan(1_150_000);
    expect(g.fersDisabilityYear1).toBeCloseTo(60_000, 6);
    expect(g.fersDisabilityAfter).toBeCloseTo(40_000, 6);
  });

  it("disabilityGap at/past MRA → zero remaining", () => {
    expect(disabilityGap(100_000, 60, 57).careerEarningsRemaining).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Gap analysis
// ---------------------------------------------------------------------------

function baseInputs(overrides: Partial<GapAnalysisInputs> = {}): GapAnalysisInputs {
  return {
    federal: {
      dob: "1985-06-15",
      scd: "2015-06-15",
      maritalStatus: "single",
      dependents: 0,
      union: "None",
      federalStatus: "yes",
      militaryYears: 0,
      salary: 90_000,
      system: "FERS",
    },
    tsp: {
      balance: 60_000,
      contributionMode: "percent",
      contributionValue: 5,
      taxType: "traditional",
      fullMatch: true,
      allocation: ["C", "S"],
    },
    goals: {
      targetRetirementAge: 57,
      replacementPercent: 0.8,
      inflation: 0.025,
      ssPlan: "yes",
      ssStartAge: 62,
    },
    outside: {
      additionalSavings: 0,
      monthlySavingsOutside: 0,
      spouseMonthlyIncome: 0,
      priorPensionMonthly: 0,
      hasRothIRA: false,
    },
    assumptions: {
      retirementAge: 57,
      replacementPercent: 0.8,
      colaRate: 0.02,
      tspReturn: 0.06,
      salaryGrowth: 0.02,
      ssStartAge: 62,
      withdrawalRate: 0.04,
    },
    asOf: "2026-08-25",
    ...overrides,
  };
}

describe("computeIncomeBreakdown", () => {
  it("high 80% target on modest savings produces a positive gap with consistent components", () => {
    const b = computeIncomeBreakdown(baseInputs());
    expect(b.gapMonthly).toBeGreaterThan(0); // shortfall exists
    expect(b.targetMonthly).toBeCloseTo((0.8 * b.projectedFinalSalary) / 12, 6);
    // Headline uses steady-state at SS start (62): pension + SS + TSP + outside
    expect(b.totalMonthly).toBeCloseTo(
      b.pensionMonthly + b.ssMonthly + b.tspMonthly + b.outsideMonthly,
      6
    );
    expect(b.gapMonthly).toBeCloseTo(b.targetMonthly - b.totalMonthly, 6);
    // Components sane
    expect(b.pensionMonthly).toBeGreaterThan(0);
    expect(b.ssMonthly).toBeGreaterThan(0);
    expect(b.tspMonthly).toBeGreaterThan(0);
    expect(b.serviceAtRetirement).toBeGreaterThan(26); // 2015 SCD → 57 in 2042 ≈ 27 yrs
    expect(b.serviceAtRetirement).toBeLessThan(28);
  });

  it("supplement present in preSS window when retiring before 62, absent in postSS", () => {
    const b = computeIncomeBreakdown(baseInputs());
    expect(b.supplementMonthly).toBeGreaterThan(0);
    expect(b.preSSWindow.supplementMonthly).toBeGreaterThan(0);
    expect(b.preSSWindow.ssMonthly).toBe(0);
    expect(b.postSSWindow.supplementMonthly).toBe(0);
    expect(b.postSSWindow.ssMonthly).toBeGreaterThan(0);
    expect(b.preSSWindow.totalMonthly).toBeCloseTo(
      b.pensionMonthly + b.supplementMonthly + b.tspMonthly + b.outsideMonthly,
      6
    );
  });

  it("no supplement when retiring at 62+", () => {
    const inputs = baseInputs();
    inputs.assumptions.retirementAge = 62;
    const b = computeIncomeBreakdown(inputs);
    expect(b.supplementMonthly).toBe(0);
  });

  it("CSRS: no SS, no supplement", () => {
    const inputs = baseInputs();
    inputs.federal.system = "CSRS";
    const b = computeIncomeBreakdown(inputs);
    expect(b.ssMonthly).toBe(0);
    expect(b.supplementMonthly).toBe(0);
  });

  it("outside accounts and spouse income (married) flow into outsideMonthly", () => {
    const inputs = baseInputs();
    inputs.federal.maritalStatus = "married";
    inputs.outside = {
      additionalSavings: 50_000,
      monthlySavingsOutside: 200,
      spouseMonthlyIncome: 1_000,
      priorPensionMonthly: 300,
      hasRothIRA: true,
    };
    const b = computeIncomeBreakdown(inputs);
    expect(b.outsideMonthly).toBeGreaterThan(1_300); // pension + spouse + savings drawdown
  });

  it("higher retirement age shrinks the gap (work-longer lever)", () => {
    const at57 = computeIncomeBreakdown(baseInputs());
    const inputs62 = baseInputs();
    inputs62.assumptions.retirementAge = 62;
    const at62 = computeIncomeBreakdown(inputs62);
    expect(at62.gapMonthly).toBeLessThan(at57.gapMonthly);
  });
});

describe("age57Snapshot", () => {
  it("young employee: not yet eligible under MRA+30 if service < 30 at 57", () => {
    const inputs = baseInputs();
    inputs.federal.scd = "2022-01-01"; // ~35 yrs svc at 57? no: 2022→2042 = ~20 + wait…
    const snap = age57Snapshot(inputs);
    // scd 2022, dob 1985 → at 57 (2042) service ≈ 20.5 → not eligible
    expect(snap.eligible).toBe(false);
    expect(snap.serviceAt57).toBeLessThan(30);
  });

  it("long-service employee eligible at 57 with meaningful replacement", () => {
    const snap = age57Snapshot(baseInputs()); // scd 2015 → ~27 yrs at 57 → NOT 30
    expect(snap.serviceAt57).toBeGreaterThan(26);
    // 27 < 30 → not eligible under MRA+30
    expect(snap.eligible).toBe(false);

    const early = baseInputs();
    early.federal.scd = "2010-06-15"; // ~32 yrs at 57
    const snap2 = age57Snapshot(early);
    expect(snap2.eligible).toBe(true);
    expect(snap2.totalMonthly).toBeGreaterThan(0);
    expect(snap2.replacementPercentAchieved).toBeGreaterThan(0.2);
    expect(snap2.projectedSalaryAt57).toBeGreaterThan(early.federal.salary);
  });
});

// ---------------------------------------------------------------------------
// Gap-narrative mock (route fallback)
// ---------------------------------------------------------------------------

describe("buildMockGapNarrative", () => {
  it("shortfall → gap narrative mentions shortfall, 3 recommendations", () => {
    const r = buildMockGapNarrative({
      targetMonthly: 6_000,
      totalMonthly: 4_500,
      gapMonthly: 1_500,
      missedMatchAnnual: 2_000,
      fegliEnrollment: "basic-b",
      fegliAnnualCost: 1_200,
      disabilityCareerEarnings: 1_000_000,
      underinsuredShortfall: 400_000,
    });
    expect(r.mock).toBe(true);
    expect(r.gapNarrative).toContain("$1,500");
    expect(r.riskNarrative.length).toBeGreaterThan(50);
    expect(r.topRecommendations).toHaveLength(3);
    expect(r.topRecommendations[0].title).toContain("TSP match");
  });

  it("surplus → positive narrative", () => {
    const r = buildMockGapNarrative({
      targetMonthly: 5_000,
      totalMonthly: 6_000,
      gapMonthly: -1_000,
      fegliEnrollment: "none",
    });
    expect(r.gapNarrative).toContain("Great news");
    expect(r.topRecommendations).toHaveLength(3);
  });
});
