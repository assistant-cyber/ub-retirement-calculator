/**
 * Wizard state: the single source of truth for every step and the results
 * dashboard. Flat Phase-A profile shapes + UI-only flags, persisted to
 * sessionStorage so a refresh doesn't lose progress.
 */

import type {
  FederalProfile,
  FEGLIProfile,
  GapAnalysisInputs,
  GoalsProfile,
  OutsideAccounts,
  TSPProfile,
} from "@/types/federal";

export interface UIAssumptions {
  /** Assumed TSP / outside investment annual return, decimal (default 0.06). */
  tspReturn: number;
  /** COLA assumption, decimal (default 0.02). */
  colaRate: number;
  /** Annual salary growth, decimal (default 0.02). */
  salaryGrowth: number;
  /** Safe withdrawal rate, decimal (default 0.04). */
  withdrawalRate: number;
}

export interface LESAutofill {
  salary: boolean;
  tsp: boolean;
  fegli: boolean;
  /** FEGLI deduction per pay period from the LES, if found. */
  fegliDeductionPerPeriod: number | null;
}

export interface WizardState {
  advisorName: string;
  federal: FederalProfile;
  tsp: TSPProfile;
  fegli: FEGLIProfile;
  goals: GoalsProfile;
  outside: OutsideAccounts;
  /** UI-only flags */
  fehb: boolean;
  hsa: boolean;
  seeFegliComparison: boolean;
  hasPriorMilitary: boolean;
  hasPriorPension: boolean;
  lesAutofill: LESAutofill;
  assumptions: UIAssumptions;
}

export const STORAGE_KEY = "ub-calc-state";
export const STEP_KEY = "ub-calc-step";

export const DEFAULT_STATE: WizardState = {
  advisorName: "Not sure / Assign me one",
  federal: {
    dob: "",
    scd: "",
    maritalStatus: "single",
    dependents: 0,
    union: "None",
    federalStatus: "yes",
    militaryYears: 0,
    salary: 0,
    system: "FERS",
  },
  tsp: {
    balance: 0,
    contributionMode: "percent",
    contributionValue: 5,
    taxType: "traditional",
    fullMatch: true,
    allocation: [],
  },
  fegli: {
    enrollment: "basic",
    optionBMultiple: 1,
  },
  goals: {
    targetRetirementAge: 62,
    replacementPercent: 0.75,
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
  fehb: true,
  hsa: false,
  seeFegliComparison: true,
  hasPriorMilitary: false,
  hasPriorPension: false,
  lesAutofill: { salary: false, tsp: false, fegli: false, fegliDeductionPerPeriod: null },
  assumptions: {
    tspReturn: 0.06,
    colaRate: 0.02,
    salaryGrowth: 0.02,
    withdrawalRate: 0.04,
  },
};

/** Deep-merge a stored (possibly older-shape) state over the defaults. */
export function loadState(): WizardState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<WizardState>;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      federal: { ...DEFAULT_STATE.federal, ...parsed.federal },
      tsp: { ...DEFAULT_STATE.tsp, ...parsed.tsp },
      fegli: { ...DEFAULT_STATE.fegli, ...parsed.fegli },
      goals: { ...DEFAULT_STATE.goals, ...parsed.goals },
      outside: { ...DEFAULT_STATE.outside, ...parsed.outside },
      lesAutofill: { ...DEFAULT_STATE.lesAutofill, ...parsed.lesAutofill },
      assumptions: { ...DEFAULT_STATE.assumptions, ...parsed.assumptions },
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state: WizardState): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage full / unavailable — non-fatal
  }
}

export function loadStep(): number {
  if (typeof window === "undefined") return 1;
  const n = Number(window.sessionStorage.getItem(STEP_KEY));
  return Number.isInteger(n) && n >= 1 && n <= 7 ? n : 1;
}

export function saveStep(step: number): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STEP_KEY, String(step));
  } catch {
    // non-fatal
  }
}

export function clearStoredState(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
  window.sessionStorage.removeItem(STEP_KEY);
}

/** Map wizard state onto the Phase-A gap-analysis engine inputs. */
export function toGapInputs(state: WizardState): GapAnalysisInputs {
  return {
    federal: state.federal,
    tsp: state.tsp,
    goals: state.goals,
    outside: state.outside,
    assumptions: {
      retirementAge: state.goals.targetRetirementAge,
      replacementPercent: state.goals.replacementPercent,
      colaRate: state.assumptions.colaRate,
      tspReturn: state.assumptions.tspReturn,
      salaryGrowth: state.assumptions.salaryGrowth,
      ssStartAge: state.goals.ssStartAge,
      withdrawalRate: state.assumptions.withdrawalRate,
    },
  };
}

/** Effective TSP contribution % of salary (dollar mode converted). */
export function effectiveTspPercent(state: WizardState): number {
  if (state.tsp.contributionMode === "percent") return state.tsp.contributionValue;
  return state.federal.salary > 0
    ? (state.tsp.contributionValue / state.federal.salary) * 100
    : 0;
}
