/**
 * Gap-analysis engine: combines FERS pension, FERS supplement, Social
 * Security, TSP drawdown, and outside accounts into a monthly income
 * breakdown vs the replacement-percent target. Pure + fast so the future
 * dashboard can recompute on every slider move.
 */

import type {
  Age57Snapshot,
  GapAnalysisInputs,
  IncomeBreakdown,
  IncomeWindow,
  SSStartAge,
} from "@/types/federal";
import {
  ageAt,
  fersPension,
  fersSupplement,
  high3,
  isEligibleForSS,
  isEligibleForSupplement,
  mraForBirthYear,
  ssEstimateApprox,
  SS_FRA,
  yearsOfService,
} from "@/lib/fers-calculations";
import { projectTSP, tspMonthlyIncome } from "@/lib/tsp-projections";

function ssStartAgeToNumber(startAge: SSStartAge): number {
  return startAge === "fra" ? SS_FRA : startAge;
}

/** FV of a lump sum + level monthly contributions, monthly compounding. */
function fvOutside(
  lumpSum: number,
  monthlyContribution: number,
  annualRate: number,
  years: number
): number {
  if (years <= 0) return lumpSum;
  const m = annualRate / 12;
  const n = 12 * years;
  const fvLump = m === 0 ? lumpSum : lumpSum * Math.pow(1 + m, n);
  const fvContrib =
    monthlyContribution <= 0
      ? 0
      : m === 0
        ? monthlyContribution * n
        : (monthlyContribution * (Math.pow(1 + m, n) - 1)) / m;
  return fvLump + fvContrib;
}

export function computeIncomeBreakdown(inputs: GapAnalysisInputs): IncomeBreakdown {
  const { federal, tsp, goals, outside, assumptions } = inputs;
  const asOf = inputs.asOf ? new Date(inputs.asOf) : new Date();

  const currentAge = ageAt(federal.dob, asOf);
  const retirementAge = assumptions.retirementAge;
  const yearsToRetire = Math.max(0, retirementAge - currentAge);
  const salaryGrowth = assumptions.salaryGrowth ?? 0.02;
  const withdrawalRate = assumptions.withdrawalRate ?? 0.04;

  // Service at retirement (day-accurate current service + years to retire + military credit)
  const serviceNow = yearsOfService(federal.scd, asOf);
  const serviceAtRetirement = serviceNow + yearsToRetire + (federal.militaryYears || 0);

  // Salary projections
  const projectedFinalSalary =
    federal.salary * Math.pow(1 + salaryGrowth, yearsToRetire);
  const h3 = high3(federal.salary, yearsToRetire, salaryGrowth);

  // Pension
  const pension = fersPension(h3, serviceAtRetirement, retirementAge);
  const pensionMonthly = pension.monthly;

  // Social Security (deterministic approximation for the engine)
  const ssApprox = ssEstimateApprox(
    federal.salary,
    currentAge,
    serviceNow,
    serviceNow + yearsToRetire
  );
  const ssEligible = isEligibleForSS(federal.system, goals.ssPlan);
  const ssStartAgeNumeric = ssStartAgeToNumber(assumptions.ssStartAge);
  const ssMonthly = ssEligible
    ? ssStartAgeNumeric >= 70
      ? ssApprox.at70
      : ssStartAgeNumeric >= SS_FRA
        ? ssApprox.atFRA
        : ssApprox.at62
    : 0;

  // FERS supplement: MRA → 62 only, not for CSRS, only if retiring before 62
  const mra = mraForBirthYear(new Date(federal.dob).getFullYear());
  const supplementEligible =
    isEligibleForSupplement(federal.system) &&
    retirementAge < 62 &&
    retirementAge >= mra;
  const supplementMonthly = supplementEligible
    ? fersSupplement(serviceAtRetirement, ssApprox.at62).monthly
    : 0;

  // TSP projection to retirement
  const tspPoints = projectTSP(
    tsp.balance,
    federal.salary,
    tsp.contributionMode,
    tsp.contributionValue,
    assumptions.tspReturn,
    Math.round(yearsToRetire),
    salaryGrowth,
    currentAge
  );
  const tspBalanceAtRetirement = tspPoints[tspPoints.length - 1].balance;
  const tspMonthly = tspMonthlyIncome(tspBalanceAtRetirement, withdrawalRate);

  // Outside accounts: 4% (withdrawalRate) on FV of additional savings +
  // outside monthly savings, plus prior pension and spouse income.
  const outsideFV = fvOutside(
    outside.additionalSavings,
    outside.monthlySavingsOutside,
    assumptions.tspReturn,
    yearsToRetire
  );
  const outsideMonthly =
    (outsideFV * withdrawalRate) / 12 +
    (outside.priorPensionMonthly || 0) +
    (federal.maritalStatus === "married" ? outside.spouseMonthlyIncome || 0 : 0);

  // Headline: steady-state at chosen SS start age (supplement excluded when
  // SS is flowing; supplement only bridges pre-62).
  const headlineSupplement = 0; // steady-state post-SS view has no supplement
  const totalMonthly =
    pensionMonthly + ssMonthly + tspMonthly + outsideMonthly + headlineSupplement +
    // If retiring before 62 and never claiming SS, the supplement is the
    // sustained bridge — include it in the headline when SS is 0.
    (ssMonthly === 0 ? supplementMonthly : 0);

  const targetMonthly =
    (assumptions.replacementPercent * projectedFinalSalary) / 12;
  const gapMonthly = targetMonthly - totalMonthly;

  const preSSWindow: IncomeWindow = {
    fromAge: retirementAge,
    toAge: 62,
    pensionMonthly,
    supplementMonthly,
    ssMonthly: 0,
    tspMonthly,
    outsideMonthly,
    totalMonthly: pensionMonthly + supplementMonthly + tspMonthly + outsideMonthly,
  };

  const postSSWindow: IncomeWindow = {
    fromAge: Math.max(retirementAge, ssStartAgeNumeric),
    pensionMonthly,
    supplementMonthly: 0,
    ssMonthly,
    tspMonthly,
    outsideMonthly,
    totalMonthly: pensionMonthly + ssMonthly + tspMonthly + outsideMonthly,
  };

  return {
    pensionMonthly,
    supplementMonthly,
    ssMonthly,
    tspMonthly,
    outsideMonthly,
    totalMonthly,
    targetMonthly,
    gapMonthly,
    preSSWindow,
    postSSWindow,
    projectedFinalSalary,
    high3: h3,
    serviceAtRetirement,
    tspBalanceAtRetirement,
    ssStartAgeNumeric,
  };
}

/**
 * Section-E card: what income could look like at age 57 (MRA for most people
 * born 1970+), retiring at the earliest opportunity.
 */
export function age57Snapshot(inputs: GapAnalysisInputs): Age57Snapshot {
  const { federal } = inputs;
  const asOf = inputs.asOf ? new Date(inputs.asOf) : new Date();
  const currentAge = ageAt(federal.dob, asOf);
  const yearsUntil57 = Math.max(0, 57 - currentAge);
  const salaryGrowth = inputs.assumptions.salaryGrowth ?? 0.02;

  const serviceNow = yearsOfService(federal.scd, asOf);
  const serviceAt57 = serviceNow + yearsUntil57 + (federal.militaryYears || 0);
  const mra = mraForBirthYear(new Date(federal.dob).getFullYear());
  // MRA+30 immediate unreduced retirement at 57 requires 30 yrs (and 57 ≥ MRA).
  const eligible = serviceAt57 >= 30 && 57 >= mra;

  const projectedSalaryAt57 = federal.salary * Math.pow(1 + salaryGrowth, yearsUntil57);

  const breakdown = computeIncomeBreakdown({
    ...inputs,
    assumptions: { ...inputs.assumptions, retirementAge: 57 },
  });

  const totalMonthly =
    breakdown.pensionMonthly + breakdown.supplementMonthly + breakdown.tspMonthly;

  return {
    eligible,
    yearsUntil57,
    projectedSalaryAt57,
    pensionMonthly: breakdown.pensionMonthly,
    supplementMonthly: breakdown.supplementMonthly,
    tspMonthly: breakdown.tspMonthly,
    totalMonthly,
    replacementPercentAchieved:
      projectedSalaryAt57 > 0 ? totalMonthly / (projectedSalaryAt57 / 12) : 0,
    serviceAt57,
  };
}
