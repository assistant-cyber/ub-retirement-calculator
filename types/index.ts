export type Lifestyle = "modest" | "comfortable" | "luxury";

export type ContributionFrequency = "monthly" | "annually";

export type AssetType =
  | "401k"
  | "traditional-ira"
  | "roth-ira"
  | "brokerage"
  | "savings"
  | "pension-lump-sum"
  | "real-estate";

export interface Asset {
  id: string;
  type: AssetType;
  institution: string;
  balance: number;
  contribution: number;
  frequency: ContributionFrequency;
}

/**
 * Calc input type — unchanged so lib/calc.ts stays untouched.
 * AboutState + GoalsState are mapped into this via toVisionState().
 */
export interface VisionState {
  currentAge: number;
  retirementAge: number;
  lifestyle: Lifestyle | null;
  monthlySpend: number;
  homePaidOff: boolean;
  monthlyHousing: number;
  monthlySocialSecurity: number;
}

export interface AssumptionsState {
  annualReturn: number; // e.g. 0.07
  inflation: number; // e.g. 0.025
  withdrawalRate: number; // e.g. 0.04
}

export interface AssetsState {
  assets: Asset[];
  annualEmployerMatch: number;
  assumptions: AssumptionsState;
}

/* ---------- Step 1: About you ---------- */

export type MaritalStatus = "single" | "married";
export type FederalStatus = "yes" | "no" | "retired-military";

export interface AboutState {
  currentAge: number;
  retirementAge: number;
  maritalStatus: MaritalStatus | null;
  federalStatus: FederalStatus | null;
  agency: string;
  yearsOfService: number | null;
}

/* ---------- Step 2: Federal benefits engagement ---------- */

export type BenefitKey =
  | "tsp"
  | "pension"
  | "fehb"
  | "fegli"
  | "disability"
  | "long-term-care"
  | "fedvip"
  | "hsa-fsa";

export type BenefitStatus = "using" | "not-using" | "unsure";
export type TspMatchAnswer = "yes" | "no" | "unsure";

export interface BenefitSelection {
  key: BenefitKey;
  status: BenefitStatus | null;
  tspFullMatch?: TspMatchAnswer;
}

export type BenefitsState = Record<BenefitKey, BenefitSelection>;

/* ---------- Step 3: Goals ---------- */

export type PriorityKey =
  | "travel"
  | "family"
  | "healthcare"
  | "inheritance"
  | "hobbies"
  | "giving"
  | "part-time-work"
  | "peace-of-mind";

export interface GoalsState {
  lifestyle: Lifestyle | null;
  monthlySpend: number;
  homePaidOff: boolean;
  monthlyHousing: number;
  monthlySocialSecurity: number;
  idealRetirement: string;
  biggestWorry: string;
  priorities: PriorityKey[];
}

/* ---------- Advisor insights (API contract) ---------- */

export interface BenefitGapInsight {
  title: string;
  detail: string;
}

export interface ActionStepInsight {
  step: string;
  why: string;
}

export interface AdvisorInsights {
  summary: string;
  benefitGaps: BenefitGapInsight[];
  goalAlignment: string;
  actionSteps: ActionStepInsight[];
  encouragement: string;
  mock?: boolean;
}

export interface WizardState {
  about: AboutState;
  benefits: BenefitsState;
  goals: GoalsState;
  assetsStep: AssetsState;
}
