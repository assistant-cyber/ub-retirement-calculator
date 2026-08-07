/**
 * Pure retirement-math functions. Monthly compounding throughout.
 * All rates are annual decimals (e.g. 0.07 = 7%).
 *
 * Simplification (documented): annual contributions are converted to a
 * monthly equivalent (annual / 12) and treated as an ordinary monthly
 * annuity. This slightly over/under-states timing effects but keeps the
 * model simple and consistent.
 */

import type { Asset, AssetsState, VisionState, AssumptionsState } from "@/types";

/** Future value of a lump sum with monthly compounding. */
export function fvLumpSum(principal: number, annualRate: number, years: number): number {
  if (years <= 0) return principal;
  if (annualRate === 0) return principal;
  const m = annualRate / 12;
  return principal * Math.pow(1 + m, 12 * years);
}

/** Future value of a level monthly contribution (ordinary annuity), monthly compounding. */
export function fvMonthlyContributions(pmt: number, annualRate: number, years: number): number {
  if (years <= 0 || pmt <= 0) return 0;
  const n = 12 * years;
  if (annualRate === 0) return pmt * n; // linear growth edge case
  const m = annualRate / 12;
  return (pmt * (Math.pow(1 + m, n) - 1)) / m;
}

/** Convert a contribution to its monthly equivalent. Annual amounts are divided by 12. */
export function monthlyEquivalent(amount: number, frequency: "monthly" | "annually"): number {
  return frequency === "annually" ? amount / 12 : amount;
}

/** Net monthly need in today's dollars: spending + housing (if home not paid off) − SS/pension. Clamped ≥ 0. */
export function netMonthlyNeedToday(vision: VisionState): number {
  const housing = vision.homePaidOff ? 0 : vision.monthlyHousing;
  return Math.max(0, vision.monthlySpend + housing - vision.monthlySocialSecurity);
}

/** Inflate a today's-dollar amount over `years` at annual `inflation`. */
export function inflate(amountToday: number, inflation: number, years: number): number {
  if (years <= 0 || inflation === 0) return amountToday;
  return amountToday * Math.pow(1 + inflation, years);
}

/** Nest egg needed at retirement using the withdrawal-rate rule. */
export function neededNestEgg(
  netMonthlyNeedTodayDollars: number,
  inflation: number,
  years: number,
  withdrawalRate: number
): number {
  if (withdrawalRate <= 0) return Infinity;
  const needAtRetirement = inflate(netMonthlyNeedTodayDollars, inflation, years);
  return (needAtRetirement * 12) / withdrawalRate;
}

/** Projected future value of a single asset (balance + contributions) at retirement. */
export function projectAsset(asset: Asset, annualRate: number, years: number): number {
  const pmt = monthlyEquivalent(asset.contribution, asset.frequency);
  return fvLumpSum(asset.balance, annualRate, years) + fvMonthlyContributions(pmt, annualRate, years);
}

/** Total projected savings across all assets plus employer match (annual → monthly equivalent). */
export function projectTotal(assetsStep: AssetsState, years: number): number {
  const r = assetsStep.assumptions.annualReturn;
  const assetsTotal = assetsStep.assets.reduce((sum, a) => sum + projectAsset(a, r, years), 0);
  const matchMonthly = monthlyEquivalent(assetsStep.annualEmployerMatch, "annually");
  return assetsTotal + fvMonthlyContributions(matchMonthly, r, years);
}

/**
 * Extra monthly contribution (PMT) required to accumulate `gap` dollars in `years`
 * at `annualRate`, monthly compounding. r=0 falls back to linear.
 */
export function requiredExtraMonthly(gap: number, annualRate: number, years: number): number {
  if (gap <= 0) return 0;
  const n = 12 * years;
  if (n <= 0) return Infinity;
  if (annualRate === 0) return gap / n;
  const m = annualRate / 12;
  return (gap * m) / (Math.pow(1 + m, n) - 1);
}

export interface YearPoint {
  age: number;
  balance: number;
}

/** Projected total balance at each age from now to retirement (inclusive). */
export function projectionByYear(
  assetsStep: AssetsState,
  currentAge: number,
  retirementAge: number
): YearPoint[] {
  const points: YearPoint[] = [];
  for (let age = currentAge; age <= retirementAge; age++) {
    points.push({ age, balance: projectTotal(assetsStep, age - currentAge) });
  }
  return points;
}

export type Band = "needs-attention" | "getting-close" | "on-track";

export function readinessBand(percent: number): Band {
  if (percent >= 100) return "on-track";
  if (percent >= 70) return "getting-close";
  return "needs-attention";
}

export interface ResultsSummary {
  years: number;
  projected: number;
  needed: number;
  percent: number; // uncapped, rounded
  barPercent: number; // capped at 150 for display
  band: Band;
  netNeedTodayMonthly: number;
  netNeedAtRetirementMonthly: number;
  sustainableMonthlyIncome: number;
  gap: number; // needed − projected, clamped ≥ 0
  extraMonthlyToClose: number;
}

/** One-stop computation for the results step. */
export function computeResults(vision: VisionState, assetsStep: AssetsState): ResultsSummary {
  const years = Math.max(0, vision.retirementAge - vision.currentAge);
  const { inflation, withdrawalRate } = assetsStep.assumptions;
  const netToday = netMonthlyNeedToday(vision);
  const netAtRetirement = inflate(netToday, inflation, years);
  const needed = neededNestEgg(netToday, inflation, years, withdrawalRate);
  const projected = projectTotal(assetsStep, years);
  const percent = needed > 0 ? (projected / needed) * 100 : 100;
  const gap = Math.max(0, needed - projected);
  return {
    years,
    projected,
    needed,
    percent,
    barPercent: Math.min(150, percent),
    band: readinessBand(percent),
    netNeedTodayMonthly: netToday,
    netNeedAtRetirementMonthly: netAtRetirement,
    sustainableMonthlyIncome: (projected * withdrawalRate) / 12,
    gap,
    extraMonthlyToClose: requiredExtraMonthly(gap, assetsStep.assumptions.annualReturn, years),
  };
}

export const DEFAULT_ASSUMPTIONS: AssumptionsState = {
  annualReturn: 0.07,
  inflation: 0.025,
  withdrawalRate: 0.04,
};
