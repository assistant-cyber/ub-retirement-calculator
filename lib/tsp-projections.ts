/**
 * TSP-specific projections: agency match, missed-match cost, balance
 * projection with monthly compounding, drawdown income, and disability gap.
 * Pure + deterministic.
 */

import type {
  DisabilityGapResult,
  TSPContributionMode,
  TSPProjectionPoint,
} from "@/types/federal";

/**
 * FERS agency TSP contribution:
 * 1% automatic + dollar-for-dollar on first 3% + 50¢/dollar on next 2%.
 * Full 5% employee contribution → 5% agency (1% auto + 4% match).
 * Returns annual dollars.
 */
export function agencyMatch(salary: number, contributionPercent: number): number {
  const pct = Math.max(0, contributionPercent);
  const auto = 0.01;
  const dollarForDollar = Math.min(pct, 3) / 100;
  const fiftyCents = (Math.min(Math.max(pct - 3, 0), 2) / 100) * 0.5;
  return salary * (auto + dollarForDollar + fiftyCents);
}

/** Annual match dollars left on the table vs contributing the full 5%. */
export function missedMatch(salary: number, contributionPercent: number): number {
  return Math.max(0, agencyMatch(salary, 5) - agencyMatch(salary, contributionPercent));
}

/**
 * Future value of the missed match, treated as a level monthly annuity
 * compounding monthly at `rate`.
 */
export function missedMatchFutureValue(
  salary: number,
  contributionPercent: number,
  years: number,
  rate = 0.06
): number {
  const monthlyMissed = missedMatch(salary, contributionPercent) / 12;
  if (monthlyMissed <= 0 || years <= 0) return 0;
  const n = 12 * years;
  if (rate === 0) return monthlyMissed * n;
  const m = rate / 12;
  return (monthlyMissed * (Math.pow(1 + m, n) - 1)) / m;
}

/**
 * Project the TSP balance year by year, compounding monthly. Contributions
 * grow with salary. Agency match is included whenever the employee
 * contributes (and the 1% automatic is always included for percent-mode
 * users, per FERS rules — dollar-mode contributions are converted to an
 * effective percent of that year's salary for match purposes).
 */
export function projectTSP(
  balance: number,
  salary: number,
  contributionMode: TSPContributionMode,
  contributionValue: number,
  annualReturn: number,
  years: number,
  salaryGrowth = 0.02,
  currentAge?: number
): TSPProjectionPoint[] {
  const points: TSPProjectionPoint[] = [
    { year: 0, balance, ...(currentAge !== undefined ? { age: currentAge } : {}) },
  ];
  let bal = balance;
  const m = annualReturn / 12;

  for (let y = 1; y <= years; y++) {
    const yearSalary = salary * Math.pow(1 + salaryGrowth, y - 1);
    const employeeAnnual =
      contributionMode === "percent"
        ? yearSalary * (contributionValue / 100)
        : contributionValue;
    const effectivePercent =
      contributionMode === "percent"
        ? contributionValue
        : yearSalary > 0
          ? (contributionValue / yearSalary) * 100
          : 0;
    const matchAnnual = agencyMatch(yearSalary, effectivePercent);
    const monthlyContribution = (employeeAnnual + matchAnnual) / 12;

    for (let mo = 0; mo < 12; mo++) {
      bal = bal * (1 + m) + monthlyContribution;
    }
    points.push({
      year: y,
      balance: bal,
      ...(currentAge !== undefined ? { age: currentAge + y } : {}),
    });
  }
  return points;
}

/** Monthly income from the balance at a safe withdrawal rate (default 4%). */
export function tspMonthlyIncome(
  balanceAtRetirement: number,
  withdrawalRate = 0.04
): number {
  return (balanceAtRetirement * withdrawalRate) / 12;
}

/**
 * Disability income gap: remaining career earnings to MRA (simple sum of
 * salary growing 2%/yr) plus FERS disability retirement approximations
 * (60% of High-3 ≈ salary in year 1, 40% thereafter).
 */
export function disabilityGap(
  salary: number,
  currentAge: number,
  mra: number
): DisabilityGapResult {
  const yearsToMra = Math.max(0, mra - currentAge);
  const wholeYears = Math.floor(yearsToMra);
  let careerEarningsRemaining = 0;
  for (let k = 0; k < wholeYears; k++) {
    careerEarningsRemaining += salary * Math.pow(1.02, k);
  }
  // Fractional final year
  const frac = yearsToMra - wholeYears;
  if (frac > 0) {
    careerEarningsRemaining += salary * Math.pow(1.02, wholeYears) * frac;
  }
  return {
    careerEarningsRemaining,
    fersDisabilityYear1: 0.6 * salary,
    fersDisabilityAfter: 0.4 * salary,
    yearsToMra,
  };
}
