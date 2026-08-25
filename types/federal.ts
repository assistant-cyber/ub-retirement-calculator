/**
 * Phase-A types for the federal retirement engine (rebuild spec v3).
 *
 * Design note: all profile shapes are FLAT and JSON-serializable so they map
 * cleanly to Salesforce fields in Phase 2 (one field per column, no nested
 * objects beyond one level, ISO date strings instead of Date instances).
 */

// ---------------------------------------------------------------------------
// Profile inputs
// ---------------------------------------------------------------------------

export type RetirementSystem = "FERS" | "CSRS" | "FERS-RAE";

export type MaritalStatus = "single" | "married";

export type FederalStatus = "yes" | "no" | "retired-military";

export type UnionAffiliation =
  | "AFGE"
  | "NTEU"
  | "NFFE"
  | "AFSCME"
  | "None"
  | "Other";

export interface FederalProfile {
  /** Date of birth — ISO date string, e.g. "1985-06-15". */
  dob: string;
  /** Service Computation Date — ISO date string. */
  scd: string;
  maritalStatus: MaritalStatus;
  /** Number of dependents, 0–4 (4 means "4+"). */
  dependents: 0 | 1 | 2 | 3 | 4;
  union: UnionAffiliation;
  federalStatus: FederalStatus;
  /** Prior military service years (creditable toward FERS if deposit made). */
  militaryYears: number;
  /** Current annual base salary in dollars. */
  salary: number;
  system: RetirementSystem;
}

export type TSPContributionMode = "percent" | "dollar";
export type TSPTaxType = "roth" | "traditional" | "split";

export interface TSPProfile {
  /** Current TSP balance in dollars. */
  balance: number;
  contributionMode: TSPContributionMode;
  /**
   * If mode = "percent": percent of salary (e.g. 5 means 5%).
   * If mode = "dollar": annual dollar contribution.
   */
  contributionValue: number;
  taxType: TSPTaxType;
  /** Whether the user reports contributing ≥5% for the full agency match. */
  fullMatch: boolean;
  /** Fund allocation labels, e.g. ["C", "S", "L2050"]. Optional risk note only. */
  allocation: string[];
}

export type FEGLIEnrollment =
  | "none"
  | "basic"
  | "basic-a"
  | "basic-b"
  | "basic-c";

export interface FEGLIProfile {
  enrollment: FEGLIEnrollment;
  /** Option B multiple of salary (1–5). Only meaningful when enrollment = "basic-b". */
  optionBMultiple: 1 | 2 | 3 | 4 | 5;
}

export type SSPlan = "yes" | "no" | "csrs";
export type SSStartAge = 62 | "fra" | 70;

export interface GoalsProfile {
  targetRetirementAge: number;
  /** Income replacement target as a decimal, e.g. 0.75 = 75%. */
  replacementPercent: number;
  /** Expected annual expense growth / inflation as a decimal, e.g. 0.025. */
  inflation: number;
  ssPlan: SSPlan;
  ssStartAge: SSStartAge;
}

export interface OutsideAccounts {
  /** Savings / investments outside TSP (lump sum today). */
  additionalSavings: number;
  /** Monthly savings rate outside federal benefits. */
  monthlySavingsOutside: number;
  /** Expected spouse income per month in retirement. */
  spouseMonthlyIncome: number;
  /** Monthly pension from prior (non-federal) employment. */
  priorPensionMonthly: number;
  hasRothIRA: boolean;
}

// ---------------------------------------------------------------------------
// Calculation results
// ---------------------------------------------------------------------------

export type EligibilityRule = "MRA+30" | "60+20" | "62+5";

export interface EligibilityScenario {
  rule: EligibilityRule;
  /** ISO date string of first eligibility under this rule. */
  eligibleDate: string;
  /** Age (decimal years) on the eligible date. */
  ageAtDate: number;
  /** Years of creditable service on the eligible date. */
  serviceAtDate: number;
  /** Years from `asOf` until eligible (0 if already eligible). */
  yearsUntil: number;
  /** Whether this rule can ever be satisfied (always true for active employees). */
  applies: boolean;
  /** True on the scenario with the earliest eligible date. */
  earliest: boolean;
}

export interface PensionResult {
  annual: number;
  monthly: number;
  /** 0.011 if retiring at 62+ with 20+ years, otherwise 0.01. */
  multiplier: number;
}

export interface SupplementResult {
  monthly: number;
  annual: number;
}

export interface SSEstimate {
  /** Monthly benefit claiming at 62. */
  at62: number;
  /** Monthly benefit at Full Retirement Age. */
  atFRA: number;
  /** Monthly benefit claiming at 70. */
  at70: number;
  /** Full Retirement Age used (e.g. 67). */
  fra: number;
  /** Approximate AIME used in the calculation. */
  aime: number;
  /** Primary Insurance Amount (monthly, at FRA). */
  pia: number;
}

export interface FEGLICostPoint {
  age: number;
  annualCost: number;
}

export interface FEGLIComparison {
  /** Total FEGLI premiums over the comparison window. */
  fegliTotal: number;
  /** Total private-term premiums over the comparison window (illustrative). */
  privateTotal: number;
  /** Death benefit amount being compared. */
  coverageAmount: number;
  years: number;
}

export interface UnderinsuredResult {
  insured: boolean;
  /** Recommended coverage: 10 × salary. */
  recommended: number;
  /** Dollars short of recommended (0 if insured). */
  shortfall: number;
}

export interface TSPProjectionPoint {
  /** Years from now (0 = today). */
  year: number;
  age?: number;
  balance: number;
}

export interface DisabilityGapResult {
  /** Sum of projected salaries (2% growth) from now to MRA. */
  careerEarningsRemaining: number;
  /** FERS disability retirement year-1 approximation: 60% of salary (High-3 proxy). */
  fersDisabilityYear1: number;
  /** FERS disability after year 1: 40% of salary (High-3 proxy). */
  fersDisabilityAfter: number;
  yearsToMra: number;
}

// ---------------------------------------------------------------------------
// Gap analysis
// ---------------------------------------------------------------------------

export interface GapAssumptions {
  retirementAge: number;
  /** Decimal, e.g. 0.75. */
  replacementPercent: number;
  /** Annual COLA / inflation decimal. */
  colaRate: number;
  /** Assumed TSP annual return decimal, e.g. 0.06. */
  tspReturn: number;
  /** Annual salary growth decimal (default 0.02). */
  salaryGrowth: number;
  ssStartAge: SSStartAge;
  /** Safe withdrawal rate decimal (default 0.04). */
  withdrawalRate: number;
}

export interface GapAnalysisInputs {
  federal: FederalProfile;
  tsp: TSPProfile;
  goals: GoalsProfile;
  outside: OutsideAccounts;
  assumptions: GapAssumptions;
  /** Reference "today" for deterministic testing. Defaults to new Date(). */
  asOf?: string;
}

export interface IncomeWindow {
  /** Age this window starts. */
  fromAge: number;
  /** Age this window ends (undefined = lifetime). */
  toAge?: number;
  pensionMonthly: number;
  supplementMonthly: number;
  ssMonthly: number;
  tspMonthly: number;
  outsideMonthly: number;
  totalMonthly: number;
}

export interface IncomeBreakdown {
  pensionMonthly: number;
  /** 0 if retirementAge ≥ 62 or not eligible (CSRS). */
  supplementMonthly: number;
  /** Steady-state SS at the chosen start age (0 if not eligible / plan "no"). */
  ssMonthly: number;
  tspMonthly: number;
  outsideMonthly: number;
  totalMonthly: number;
  targetMonthly: number;
  /** target − total; positive = shortfall. */
  gapMonthly: number;
  /** Bridge window from retirement to 62 (pension + supplement + TSP + outside). */
  preSSWindow: IncomeWindow;
  /** Window from SS start age on (pension + SS + TSP + outside). */
  postSSWindow: IncomeWindow;
  projectedFinalSalary: number;
  high3: number;
  serviceAtRetirement: number;
  tspBalanceAtRetirement: number;
  ssStartAgeNumeric: number;
}

export interface Age57Snapshot {
  /** True if projected service at 57 meets the MRA+30 rule. */
  eligible: boolean;
  yearsUntil57: number;
  projectedSalaryAt57: number;
  pensionMonthly: number;
  supplementMonthly: number;
  tspMonthly: number;
  totalMonthly: number;
  /** Achieved replacement as a decimal of projected salary at 57. */
  replacementPercentAchieved: number;
  serviceAt57: number;
}

// ---------------------------------------------------------------------------
// AI route payloads
// ---------------------------------------------------------------------------

export interface LESParseResult {
  grossPay: number | null;
  ytdEarnings: number | null;
  tspContribution: number | null;
  tspContributionType: "percent" | "dollar" | null;
  fegliDeduction: number | null;
  payPeriod: string | null;
  confidence: "high" | "medium" | "low";
  mock?: boolean;
}

export interface SSEstimateResponse {
  at62: number;
  atFRA: number;
  at70: number;
  fra: number;
  notes: string;
  /** Deterministic bend-point cross-check always returned. */
  fallback: SSEstimate;
  usedFallback: boolean;
  mock?: boolean;
}

export interface GapNarrativeResponse {
  gapNarrative: string;
  riskNarrative: string;
  topRecommendations: { title: string; detail: string }[];
  mock?: boolean;
}
