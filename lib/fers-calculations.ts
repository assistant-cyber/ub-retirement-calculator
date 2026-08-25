/**
 * Pure, deterministic FERS calculation functions.
 * Sources: OPM FERS handbook (MRA table, pension multipliers, supplement
 * formula) and SSA 2024 bend points for the deterministic SS approximation.
 * No I/O, no randomness — fully unit-testable.
 */

import type {
  EligibilityScenario,
  PensionResult,
  RetirementSystem,
  SSEstimate,
  SSPlan,
  SupplementResult,
} from "@/types/federal";

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

function toDate(d: Date | string): Date {
  return d instanceof Date ? d : new Date(d);
}

// ---------------------------------------------------------------------------
// MRA (Minimum Retirement Age) — OPM FERS MRA table by birth year
// ---------------------------------------------------------------------------

/** MRA in decimal years (e.g. 56 + 10/12 for someone born in 1969). */
export function mraForBirthYear(year: number): number {
  if (year < 1948) return 55;
  if (year >= 1948 && year <= 1952) return 55 + ((year - 1947) * 2) / 12; // 55+2mo … 55+10mo
  if (year >= 1953 && year <= 1964) return 56;
  if (year >= 1965 && year <= 1969) return 56 + ((year - 1964) * 2) / 12; // 56+2mo … 56+10mo
  return 57; // 1970 and later
}

/** Human label, e.g. "57" or "56 and 10 months". */
export function mraLabel(year: number): string {
  const mra = mraForBirthYear(year);
  const whole = Math.floor(mra);
  const months = Math.round((mra - whole) * 12);
  return months === 0 ? `${whole}` : `${whole} and ${months} month${months === 1 ? "" : "s"}`;
}

// ---------------------------------------------------------------------------
// Dates / service
// ---------------------------------------------------------------------------

/** Day-accurate decimal years of creditable service as of `asOf`. */
export function yearsOfService(scd: Date | string, asOf: Date | string): number {
  const diff = toDate(asOf).getTime() - toDate(scd).getTime();
  return Math.max(0, diff / MS_PER_YEAR);
}

/** Decimal age at `asOf`. */
export function ageAt(dob: Date | string, asOf: Date | string): number {
  return (toDate(asOf).getTime() - toDate(dob).getTime()) / MS_PER_YEAR;
}

/** Add decimal years to a date (365.25-day years). */
function addYears(date: Date, years: number): Date {
  return new Date(date.getTime() + years * MS_PER_YEAR);
}

// ---------------------------------------------------------------------------
// Eligibility scenarios: MRA+30, 60+20, 62+5
// ---------------------------------------------------------------------------

export function eligibilityScenarios(
  dob: Date | string,
  scd: Date | string,
  creditableExtraYears = 0,
  asOf: Date | string = new Date()
): EligibilityScenario[] {
  const birth = toDate(dob);
  const start = toDate(scd);
  const now = toDate(asOf);
  const mra = mraForBirthYear(birth.getFullYear());

  const rules: { rule: EligibilityScenario["rule"]; ageReq: number; svcReq: number }[] = [
    { rule: "MRA+30", ageReq: mra, svcReq: 30 },
    { rule: "60+20", ageReq: 60, svcReq: 20 },
    { rule: "62+5", ageReq: 62, svcReq: 5 },
  ];

  const scenarios = rules.map(({ rule, ageReq, svcReq }) => {
    const dateAgeMet = addYears(birth, ageReq);
    // Military deposit years count toward creditable service → service
    // requirement is met that many years sooner.
    const dateSvcMet = addYears(start, Math.max(0, svcReq - creditableExtraYears));
    const eligibleDate = dateAgeMet.getTime() >= dateSvcMet.getTime() ? dateAgeMet : dateSvcMet;
    const ageAtDate = ageAt(birth, eligibleDate);
    const serviceAtDate = yearsOfService(start, eligibleDate) + creditableExtraYears;
    const yearsUntil = Math.max(0, (eligibleDate.getTime() - now.getTime()) / MS_PER_YEAR);
    return {
      rule,
      eligibleDate: eligibleDate.toISOString().slice(0, 10),
      ageAtDate,
      serviceAtDate,
      yearsUntil,
      applies: true,
      earliest: false,
    };
  });

  const earliestIdx = scenarios.reduce(
    (best, s, i) => (s.eligibleDate < scenarios[best].eligibleDate ? i : best),
    0
  );
  scenarios[earliestIdx].earliest = true;
  return scenarios;
}

// ---------------------------------------------------------------------------
// High-3 and pension
// ---------------------------------------------------------------------------

/**
 * Projected High-3: average of the final 3 years' projected salaries,
 * assuming the salary grows by `annualRaise` each year until retirement.
 * For retirement in year n, that's the average of salary × growth^(n-3),
 * growth^(n-2), growth^(n-1).
 */
export function high3(
  currentSalary: number,
  yearsUntilRetirement: number,
  annualRaise = 0.02
): number {
  const n = Math.max(0, yearsUntilRetirement);
  if (n < 3) {
    // Fewer than 3 years out: average today's salary with the raised years.
    let sum = 0;
    for (let k = 0; k < 3; k++) {
      sum += currentSalary * Math.pow(1 + annualRaise, Math.max(0, n - 3 + k));
    }
    return sum / 3;
  }
  const g = 1 + annualRaise;
  return (
    (currentSalary * (Math.pow(g, n - 3) + Math.pow(g, n - 2) + Math.pow(g, n - 1))) / 3
  );
}

/**
 * FERS basic pension: High-3 × service years × 1.0%
 * (1.1% if retiring at age 62+ with 20+ years of service).
 */
export function fersPension(
  high3Salary: number,
  serviceYears: number,
  retirementAge: number
): PensionResult {
  const multiplier = retirementAge >= 62 && serviceYears >= 20 ? 0.011 : 0.01;
  const annual = high3Salary * serviceYears * multiplier;
  return { annual, monthly: annual / 12, multiplier };
}

/**
 * FERS Annuity Supplement: (FERS service years ÷ 40) × estimated SS benefit
 * at 62 (monthly). Payable only from MRA until age 62.
 */
export function fersSupplement(
  fersServiceYears: number,
  ssBenefitAt62Monthly: number
): SupplementResult {
  const monthly = (fersServiceYears / 40) * ssBenefitAt62Monthly;
  return { monthly, annual: monthly * 12 };
}

/** Compounded COLA adjustment. */
export function applyCola(amount: number, colaRate: number, years: number): number {
  if (years <= 0) return amount;
  return amount * Math.pow(1 + colaRate, years);
}

// ---------------------------------------------------------------------------
// System eligibility flags
// ---------------------------------------------------------------------------

/** CSRS employees do not receive the FERS supplement. */
export function isEligibleForSupplement(system: RetirementSystem): boolean {
  return system !== "CSRS";
}

/** CSRS employees do not receive Social Security through federal service. */
export function isEligibleForSS(system: RetirementSystem, ssPlan: SSPlan): boolean {
  if (system === "CSRS") return false;
  return ssPlan === "yes";
}

// ---------------------------------------------------------------------------
// Deterministic Social Security bend-point approximation
// ---------------------------------------------------------------------------

/**
 * 2024 SSA constants. This is an APPROXIMATION used as a fallback and as a
 * cross-check for the AI estimate — it assumes current salary is a proxy for
 * career-average indexed earnings and a full career is 35 years. Real SSA
 * benefits depend on the entire indexed earnings history.
 */
export const SS_WAGE_CAP_2024 = 168_600;
export const SS_BEND_POINT_1_2024 = 1_174; // monthly
export const SS_BEND_POINT_2_2024 = 7_078; // monthly
export const SS_FRA = 67;
export const SS_REDUCTION_AT_62 = 0.7; // ~30% reduction claiming at 62 (FRA 67)
export const SS_CREDIT_AT_70 = 1.24; // 8%/yr delayed credits, FRA 67 → 70

export function ssEstimateApprox(
  currentSalary: number,
  currentAge: number,
  yearsWorkedSoFar: number,
  totalCareerYears?: number
): SSEstimate {
  // Assume the person keeps working to at least 62 unless told otherwise.
  const careerYears =
    totalCareerYears ?? yearsWorkedSoFar + Math.max(0, 62 - currentAge);
  const careerScale = Math.min(1, careerYears / 35);

  const aime = (Math.min(currentSalary, SS_WAGE_CAP_2024) / 12) * careerScale;

  let pia = 0.9 * Math.min(aime, SS_BEND_POINT_1_2024);
  if (aime > SS_BEND_POINT_1_2024) {
    pia += 0.32 * (Math.min(aime, SS_BEND_POINT_2_2024) - SS_BEND_POINT_1_2024);
  }
  if (aime > SS_BEND_POINT_2_2024) {
    pia += 0.15 * (aime - SS_BEND_POINT_2_2024);
  }

  return {
    at62: Math.round(pia * SS_REDUCTION_AT_62),
    atFRA: Math.round(pia),
    at70: Math.round(pia * SS_CREDIT_AT_70),
    fra: SS_FRA,
    aime: Math.round(aime),
    pia: Math.round(pia),
  };
}
