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

export interface WizardState {
  vision: VisionState;
  assetsStep: AssetsState;
}
