/**
 * FEGLI premium tables + private-term comparison.
 *
 * Rate sources (labeled approximate):
 * - Basic: OPM FEGLI Basic employee share, $0.1600 per $1,000 of coverage per
 *   biweekly pay period (26 pay periods/year).
 * - Option A ("Standard", flat $10,000): OPM age-banded biweekly rates for
 *   the full $10,000 of coverage.
 * - Option B ("Additional", 1–5× salary): OPM age-banded biweekly rates per
 *   $1,000 of coverage (~2024 table, approximate).
 * - Private term: ILLUSTRATIVE ESTIMATE ONLY — rough healthy non-smoker
 *   level-term annual rates per $1,000 by issue-age band. Not a quote.
 */

import type {
  FEGLIComparison,
  FEGLICostPoint,
  FEGLIProfile,
  UnderinsuredResult,
} from "@/types/federal";

const PAY_PERIODS_PER_YEAR = 26;

/** OPM FEGLI Basic: $0.16 per $1,000 per biweekly pay period. */
export const BASIC_RATE_PER_1K_BIWEEKLY = 0.16;

/**
 * Basic coverage = salary rounded UP to the next $1,000 (exact multiples
 * still round up to the next thousand, per OPM), plus $2,000.
 */
export function basicCoverage(salary: number): number {
  return Math.floor(salary / 1000) * 1000 + 1000 + 2000;
}

/** Option A: flat $10,000 coverage. Biweekly premium for the full $10k by age band (OPM). */
const OPTION_A_BIWEEKLY: { maxAge: number; rate: number }[] = [
  { maxAge: 34, rate: 0.2 },
  { maxAge: 39, rate: 0.2 },
  { maxAge: 44, rate: 0.3 },
  { maxAge: 49, rate: 0.6 },
  { maxAge: 54, rate: 1.0 },
  { maxAge: 59, rate: 1.8 },
  { maxAge: Infinity, rate: 6.0 },
];

/** Option B: biweekly rate PER $1,000 of coverage by age band (~OPM 2024, approximate). */
const OPTION_B_BIWEEKLY_PER_1K: { maxAge: number; rate: number }[] = [
  { maxAge: 34, rate: 0.0433 },
  { maxAge: 39, rate: 0.0577 },
  { maxAge: 44, rate: 0.0866 },
  { maxAge: 49, rate: 0.1299 },
  { maxAge: 54, rate: 0.2021 },
  { maxAge: 59, rate: 0.3608 },
  { maxAge: 64, rate: 0.8664 },
  { maxAge: 69, rate: 1.0392 },
  { maxAge: Infinity, rate: 1.8613 },
];

/**
 * Option C ("Family"): biweekly rate PER MULTIPLE by age band (~OPM,
 * approximate). One multiple = $5,000 spouse / $2,500 per child. We model a
 * single multiple for cost purposes.
 */
const OPTION_C_BIWEEKLY_PER_MULTIPLE: { maxAge: number; rate: number }[] = [
  { maxAge: 34, rate: 0.2 },
  { maxAge: 39, rate: 0.24 },
  { maxAge: 44, rate: 0.37 },
  { maxAge: 49, rate: 0.53 },
  { maxAge: 54, rate: 0.83 },
  { maxAge: 59, rate: 1.33 },
  { maxAge: 64, rate: 2.43 },
  { maxAge: 69, rate: 2.83 },
  { maxAge: Infinity, rate: 3.83 },
];

function bandRate(table: { maxAge: number; rate: number }[], age: number): number {
  for (const band of table) {
    if (age <= band.maxAge) return band.rate;
  }
  return table[table.length - 1].rate;
}

/** Salary rounded up to the next $1,000 (OPM convention, exact multiples round up). */
function salaryRoundedUp(salary: number): number {
  return Math.floor(salary / 1000) * 1000 + 1000;
}

/** Total FEGLI death benefit for a profile (excludes Option C, which covers family). */
export function fegliCoverageAmount(profile: FEGLIProfile, salary: number): number {
  if (profile.enrollment === "none") return 0;
  let coverage = basicCoverage(salary);
  if (profile.enrollment === "basic-a") coverage += 10_000;
  if (profile.enrollment === "basic-b") {
    coverage += salaryRoundedUp(salary) * profile.optionBMultiple;
  }
  return coverage;
}

/** Total annual FEGLI premium for the enrollment at a given age + salary. */
export function fegliAnnualCost(
  profile: FEGLIProfile,
  age: number,
  salary: number
): number {
  if (profile.enrollment === "none") return 0;

  const basicAnnual =
    (basicCoverage(salary) / 1000) * BASIC_RATE_PER_1K_BIWEEKLY * PAY_PERIODS_PER_YEAR;

  let optionAnnual = 0;
  if (profile.enrollment === "basic-a") {
    optionAnnual = bandRate(OPTION_A_BIWEEKLY, age) * PAY_PERIODS_PER_YEAR;
  } else if (profile.enrollment === "basic-b") {
    const coverageK = (salaryRoundedUp(salary) / 1000) * profile.optionBMultiple;
    optionAnnual =
      coverageK * bandRate(OPTION_B_BIWEEKLY_PER_1K, age) * PAY_PERIODS_PER_YEAR;
  } else if (profile.enrollment === "basic-c") {
    optionAnnual =
      bandRate(OPTION_C_BIWEEKLY_PER_MULTIPLE, age) * PAY_PERIODS_PER_YEAR;
  }

  return basicAnnual + optionAnnual;
}

/**
 * Year-by-year FEGLI cost as the person ages — shows the dramatic premium
 * jumps at ages 45 / 50 / 55 / 60 / 65. Salary held constant (conservative).
 */
export function fegliCostOverYears(
  profile: FEGLIProfile,
  currentAge: number,
  salary: number,
  years: number
): FEGLICostPoint[] {
  const points: FEGLICostPoint[] = [];
  for (let k = 0; k < years; k++) {
    const age = currentAge + k;
    points.push({ age, annualCost: fegliAnnualCost(profile, age, salary) });
  }
  return points;
}

/**
 * Rough healthy non-smoker level-term annual premium ESTIMATE — annual rate
 * per $1,000 of coverage by issue-age band. Illustrative only, not a quote.
 */
const PRIVATE_TERM_ANNUAL_PER_1K: { maxAge: number; rate: number }[] = [
  { maxAge: 34, rate: 0.6 },
  { maxAge: 39, rate: 0.75 },
  { maxAge: 44, rate: 1.1 },
  { maxAge: 49, rate: 1.7 },
  { maxAge: 54, rate: 2.6 },
  { maxAge: 59, rate: 4.2 },
  { maxAge: 64, rate: 6.8 },
  { maxAge: Infinity, rate: 6.8 },
];

/** Level annual premium for the whole term (fixed at issue age). */
export function privateTermEstimate(
  age: number,
  coverageAmount: number,
  _termYears = 20
): number {
  const rate = bandRate(PRIVATE_TERM_ANNUAL_PER_1K, age);
  return (coverageAmount / 1000) * rate;
}

/** 20-year total cost: FEGLI (age-banded, increasing) vs level private term. */
export function twentyYearComparison(
  fegliProfile: FEGLIProfile,
  age: number,
  salary: number
): FEGLIComparison {
  const years = 20;
  const fegliTotal = fegliCostOverYears(fegliProfile, age, salary, years).reduce(
    (sum, p) => sum + p.annualCost,
    0
  );
  const coverageAmount = fegliCoverageAmount(fegliProfile, salary);
  const privateTotal = privateTermEstimate(age, coverageAmount, years) * years;
  return { fegliTotal, privateTotal, coverageAmount, years };
}

/** Rule of thumb: total death benefit should be ≥ 10× income. */
export function underinsuredCheck(
  totalDeathBenefit: number,
  salary: number
): UnderinsuredResult {
  const recommended = 10 * salary;
  const shortfall = Math.max(0, recommended - totalDeathBenefit);
  return { insured: shortfall === 0, recommended, shortfall };
}
