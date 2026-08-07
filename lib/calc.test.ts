import { describe, it, expect } from "vitest";
import {
  fvLumpSum,
  fvMonthlyContributions,
  neededNestEgg,
  netMonthlyNeedToday,
  requiredExtraMonthly,
  monthlyEquivalent,
  projectAsset,
  computeResults,
  readinessBand,
  projectionByYear,
  DEFAULT_ASSUMPTIONS,
} from "./calc";
import type { VisionState, AssetsState, Asset } from "@/types";

const closeToPct = (actual: number, expected: number, tolPct = 0.5) => {
  expect(Math.abs(actual - expected) / expected).toBeLessThanOrEqual(tolPct / 100);
};

describe("fvLumpSum", () => {
  it("$100,000 @7% for 30y ≈ $811,650 (monthly compounding)", () => {
    const fv = fvLumpSum(100_000, 0.07, 30);
    closeToPct(fv, 811_650);
  });

  it("r=0 returns principal unchanged", () => {
    expect(fvLumpSum(50_000, 0, 30)).toBe(50_000);
  });

  it("0 years returns principal", () => {
    expect(fvLumpSum(50_000, 0.07, 0)).toBe(50_000);
  });
});

describe("fvMonthlyContributions", () => {
  it("$500/mo @7% for 30y ≈ $609,985", () => {
    const fv = fvMonthlyContributions(500, 0.07, 30);
    closeToPct(fv, 609_985);
  });

  it("r=0 grows linearly", () => {
    expect(fvMonthlyContributions(500, 0, 30)).toBe(500 * 360);
  });

  it("0 years → 0", () => {
    expect(fvMonthlyContributions(500, 0.07, 0)).toBe(0);
  });

  it("0 pmt → 0", () => {
    expect(fvMonthlyContributions(0, 0.07, 30)).toBe(0);
  });
});

describe("neededNestEgg", () => {
  it("$6,500/mo net today, 2.5% inflation, 30y, 4% rule ≈ $4.088M", () => {
    const needed = neededNestEgg(6_500, 0.025, 30, 0.04);
    closeToPct(needed, 4_088_000);
  });

  it("zero years: no inflation applied", () => {
    expect(neededNestEgg(4_000, 0.025, 0, 0.04)).toBeCloseTo((4_000 * 12) / 0.04, 6);
  });

  it("zero inflation: today's need used directly", () => {
    expect(neededNestEgg(4_000, 0, 30, 0.04)).toBeCloseTo((4_000 * 12) / 0.04, 6);
  });
});

describe("netMonthlyNeedToday", () => {
  const base: VisionState = {
    currentAge: 35,
    retirementAge: 65,
    lifestyle: "comfortable",
    monthlySpend: 6_500,
    homePaidOff: true,
    monthlyHousing: 1_800,
    monthlySocialSecurity: 2_000,
  };

  it("subtracts SS and ignores housing when home paid off", () => {
    expect(netMonthlyNeedToday(base)).toBe(4_500);
  });

  it("adds housing when home not paid off", () => {
    expect(netMonthlyNeedToday({ ...base, homePaidOff: false })).toBe(6_300);
  });

  it("clamps negative net need to 0", () => {
    expect(netMonthlyNeedToday({ ...base, monthlySocialSecurity: 99_999 })).toBe(0);
  });
});

describe("requiredExtraMonthly", () => {
  it("inverts fvMonthlyContributions", () => {
    const pmt = requiredExtraMonthly(609_985, 0.07, 30);
    closeToPct(pmt, 500);
  });

  it("r=0 → linear split", () => {
    expect(requiredExtraMonthly(36_000, 0, 30)).toBe(100);
  });

  it("no gap → 0", () => {
    expect(requiredExtraMonthly(0, 0.07, 30)).toBe(0);
    expect(requiredExtraMonthly(-500, 0.07, 30)).toBe(0);
  });
});

describe("monthlyEquivalent / projectAsset", () => {
  it("annual contributions are divided by 12", () => {
    expect(monthlyEquivalent(12_000, "annually")).toBe(1_000);
    expect(monthlyEquivalent(500, "monthly")).toBe(500);
  });

  it("projectAsset = FV(balance) + FV(contributions)", () => {
    const asset: Asset = {
      id: "a1",
      type: "401k",
      institution: "Fidelity",
      balance: 100_000,
      contribution: 500,
      frequency: "monthly",
    };
    const fv = projectAsset(asset, 0.07, 30);
    closeToPct(fv, 811_650 + 609_985);
  });
});

describe("computeResults integration", () => {
  const vision: VisionState = {
    currentAge: 35,
    retirementAge: 65,
    lifestyle: "comfortable",
    monthlySpend: 6_500,
    homePaidOff: true,
    monthlyHousing: 0,
    monthlySocialSecurity: 0,
  };
  const assetsStep: AssetsState = {
    assets: [
      {
        id: "a1",
        type: "401k",
        institution: "",
        balance: 100_000,
        contribution: 500,
        frequency: "monthly",
      },
    ],
    annualEmployerMatch: 0,
    assumptions: DEFAULT_ASSUMPTIONS,
  };

  it("produces consistent summary", () => {
    const r = computeResults(vision, assetsStep);
    expect(r.years).toBe(30);
    closeToPct(r.projected, 811_650 + 609_985);
    closeToPct(r.needed, 4_088_000);
    expect(r.band).toBe("needs-attention");
    expect(r.barPercent).toBeLessThanOrEqual(150);
    expect(r.gap).toBeGreaterThan(0);
    expect(r.extraMonthlyToClose).toBeGreaterThan(0);
    expect(r.sustainableMonthlyIncome).toBeCloseTo((r.projected * 0.04) / 12, 4);
  });

  it("bar percent caps at 150", () => {
    const rich: AssetsState = {
      ...assetsStep,
      assets: [{ ...assetsStep.assets[0], balance: 10_000_000 }],
    };
    const r = computeResults(vision, rich);
    expect(r.barPercent).toBe(150);
    expect(r.band).toBe("on-track");
  });
});

describe("readinessBand", () => {
  it("bands correctly", () => {
    expect(readinessBand(50)).toBe("needs-attention");
    expect(readinessBand(69.9)).toBe("needs-attention");
    expect(readinessBand(70)).toBe("getting-close");
    expect(readinessBand(99.9)).toBe("getting-close");
    expect(readinessBand(100)).toBe("on-track");
  });
});

describe("projectionByYear", () => {
  it("returns one point per age, monotonically increasing with positive contributions", () => {
    const assetsStep: AssetsState = {
      assets: [
        { id: "x", type: "savings", institution: "", balance: 10_000, contribution: 200, frequency: "monthly" },
      ],
      annualEmployerMatch: 0,
      assumptions: DEFAULT_ASSUMPTIONS,
    };
    const pts = projectionByYear(assetsStep, 40, 65);
    expect(pts).toHaveLength(26);
    expect(pts[0].age).toBe(40);
    expect(pts[0].balance).toBe(10_000);
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i].balance).toBeGreaterThan(pts[i - 1].balance);
    }
  });
});
