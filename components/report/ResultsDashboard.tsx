"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  GapNarrativeResponse,
  SSEstimateResponse,
  SSStartAge,
} from "@/types/federal";
import { computeIncomeBreakdown, age57Snapshot } from "@/lib/gap-analysis";
import {
  ageAt,
  eligibilityScenarios,
  yearsOfService,
  SS_FRA,
} from "@/lib/fers-calculations";
import {
  fegliAnnualCost,
  fegliCoverageAmount,
  privateTermEstimate,
  twentyYearComparison,
  underinsuredCheck,
} from "@/lib/fegli-rates";
import { disabilityGap, missedMatch, projectTSP } from "@/lib/tsp-projections";
import { mraForBirthYear } from "@/lib/fers-calculations";
import Accordion from "@/components/ui/Accordion";
import Slider from "@/components/ui/Slider";
import EligibilityTimeline from "@/components/report/EligibilityTimeline";
import IncomeBreakdown from "@/components/report/IncomeBreakdown";
import GapAnalysis from "@/components/report/GapAnalysis";
import RiskAnalysis from "@/components/report/RiskAnalysis";
import Age57SnapshotSection from "@/components/report/Age57Snapshot";
import ReportActions from "@/components/report/ReportActions";
import type { ReportPDFProps } from "@/components/ReportPDF";
import {
  effectiveTspPercent,
  toGapInputs,
  type WizardState,
} from "@/components/wizard-state";

interface Props {
  state: WizardState;
  setState: (updater: (prev: WizardState) => WizardState) => void;
  onStartOver: () => void;
  onAdjust: () => void;
}

const SS_STOPS: { value: SSStartAge; label: string }[] = [
  { value: 62, label: "62" },
  { value: "fra", label: `FRA (${SS_FRA})` },
  { value: 70, label: "70" },
];

export default function ResultsDashboard({ state, setState, onStartOver, onAdjust }: Props) {
  // ------- derived engine outputs (recompute on every slider move) -------
  const currentAge = useMemo(() => ageAt(state.federal.dob, new Date()), [state.federal.dob]);
  const inputs = useMemo(() => toGapInputs(state), [state]);
  const breakdown = useMemo(() => computeIncomeBreakdown(inputs), [inputs]);
  const snapshot = useMemo(() => age57Snapshot(inputs), [inputs]);
  const scenarios = useMemo(
    () => eligibilityScenarios(state.federal.dob, state.federal.scd, state.federal.militaryYears),
    [state.federal.dob, state.federal.scd, state.federal.militaryYears]
  );
  const tspPoints = useMemo(() => {
    const yearsToRetire = Math.max(0, Math.round(state.goals.targetRetirementAge - currentAge));
    return projectTSP(
      state.tsp.balance,
      state.federal.salary,
      state.tsp.contributionMode,
      state.tsp.contributionValue,
      state.assumptions.tspReturn,
      yearsToRetire,
      state.assumptions.salaryGrowth,
      currentAge
    );
  }, [state, currentAge]);

  // ------- Social Security estimate (fetched once, cached in state) -------
  const [ssEstimate, setSsEstimate] = useState<SSEstimateResponse | null>(null);
  const [ssLoading, setSsLoading] = useState(false);
  const ssFetched = useRef(false);
  useEffect(() => {
    if (ssFetched.current || state.federal.system === "CSRS") return;
    ssFetched.current = true;
    setSsLoading(true);
    fetch("/api/ai/ss-estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        age: currentAge,
        salary: state.federal.salary,
        scd: state.federal.scd,
        yearsOfService: yearsOfService(state.federal.scd, new Date()),
      }),
    })
      .then((r) => (r.ok ? (r.json() as Promise<SSEstimateResponse>) : null))
      .then((data) => {
        if (data) setSsEstimate(data);
      })
      .catch(() => undefined)
      .finally(() => setSsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------- gap narrative (fetched once when Section C first opens) -------
  const [narrative, setNarrative] = useState<GapNarrativeResponse | null>(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [narrativeError, setNarrativeError] = useState(false);
  const narrativeFetched = useRef(false);

  const fetchNarrative = useCallback(() => {
    narrativeFetched.current = true;
    setNarrativeLoading(true);
    setNarrativeError(false);
    const tspPct = effectiveTspPercent(state);
    const fegliAnnual = fegliAnnualCost(state.fegli, currentAge, state.federal.salary);
    const coverage = fegliCoverageAmount(state.fegli, state.federal.salary);
    const mra = mraForBirthYear(new Date(`${state.federal.dob}T00:00:00`).getFullYear());
    const disability = disabilityGap(state.federal.salary, currentAge, mra);
    const under = underinsuredCheck(coverage, state.federal.salary);
    fetch("/api/ai/gap-narrative", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentAge: Math.round(currentAge),
        retirementAge: state.goals.targetRetirementAge,
        salary: state.federal.salary,
        targetMonthly: Math.round(breakdown.targetMonthly),
        totalMonthly: Math.round(breakdown.totalMonthly),
        gapMonthly: Math.round(breakdown.gapMonthly),
        pensionMonthly: Math.round(breakdown.pensionMonthly),
        supplementMonthly: Math.round(breakdown.supplementMonthly),
        ssMonthly: Math.round(breakdown.ssMonthly),
        tspMonthly: Math.round(breakdown.tspMonthly),
        tspContributionPercent: Math.round(tspPct),
        missedMatchAnnual: Math.round(missedMatch(state.federal.salary, tspPct)),
        fegliEnrollment: state.fegli.enrollment,
        fegliAnnualCost: Math.round(fegliAnnual),
        privateTermAnnualCost: Math.round(privateTermEstimate(currentAge, coverage, 20)),
        disabilityCareerEarnings: Math.round(disability.careerEarningsRemaining),
        underinsuredShortfall: Math.round(under.shortfall),
        replacementPercent: state.goals.replacementPercent,
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("narrative failed");
        return r.json() as Promise<GapNarrativeResponse>;
      })
      .then(setNarrative)
      .catch(() => setNarrativeError(true))
      .finally(() => setNarrativeLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, currentAge, breakdown]);

  const onGapFirstOpen = useCallback(() => {
    if (!narrativeFetched.current) fetchNarrative();
  }, [fetchNarrative]);

  // ------- risk numbers + PDF props -------
  const riskNumbers = useMemo(() => {
    const fegliAnnual = fegliAnnualCost(state.fegli, currentAge, state.federal.salary);
    const cmp = twentyYearComparison(state.fegli, currentAge, state.federal.salary);
    const coverage = fegliCoverageAmount(state.fegli, state.federal.salary);
    const under = underinsuredCheck(coverage, state.federal.salary);
    const mra = mraForBirthYear(new Date(`${state.federal.dob}T00:00:00`).getFullYear());
    const disability = disabilityGap(state.federal.salary, currentAge, mra);
    return { fegliAnnual, cmp, coverage, under, disability };
  }, [state.fegli, state.federal, currentAge]);

  const pdfProps: ReportPDFProps = useMemo(
    () => ({
      currentAge,
      retirementAge: state.goals.targetRetirementAge,
      replacementPercent: state.goals.replacementPercent,
      system: state.federal.system,
      advisorName: state.advisorName,
      scenarios,
      breakdown,
      snapshot,
      ssEstimate,
      narrative,
      fegliAnnual: riskNumbers.fegliAnnual,
      fegliTwentyYearTotal: riskNumbers.cmp.fegliTotal,
      privateTwentyYearTotal: riskNumbers.cmp.privateTotal,
      fegliCoverage: riskNumbers.coverage,
      underinsuredShortfall: riskNumbers.under.shortfall,
      disabilityCareerEarnings: riskNumbers.disability.careerEarningsRemaining,
      fersDisabilityYear1: riskNumbers.disability.fersDisabilityYear1,
      fersDisabilityAfter: riskNumbers.disability.fersDisabilityAfter,
      missedMatchAnnual: missedMatch(state.federal.salary, effectiveTspPercent(state)),
    }),
    [currentAge, state, scenarios, breakdown, snapshot, ssEstimate, narrative, riskNumbers]
  );

  const ssIndex = SS_STOPS.findIndex((s) => s.value === state.goals.ssStartAge);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold sm:text-4xl">Your Retirement Report</h1>
        <p className="mt-1 max-w-2xl text-gray-600">
          A live, interactive picture of your federal retirement. Adjust the assumptions below and
          every number, chart, and recommendation updates in real time.
        </p>
      </div>

      {/* -------- Assumptions panel (sticky) -------- */}
      <div className="assumptions-panel card sticky top-2 z-20 space-y-4 !p-4 shadow-md sm:!p-5">
        <h3 className="font-heading text-base font-semibold text-navy">Your assumptions</h3>
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Slider
            label="Retirement age"
            value={state.goals.targetRetirementAge}
            min={50}
            max={72}
            onChange={(v) =>
              setState((p) => ({ ...p, goals: { ...p.goals, targetRetirementAge: v } }))
            }
          />
          <Slider
            label="Income replacement"
            value={Math.round(state.goals.replacementPercent * 100)}
            min={50}
            max={100}
            format={(v) => `${v}%`}
            onChange={(v) =>
              setState((p) => ({ ...p, goals: { ...p.goals, replacementPercent: v / 100 } }))
            }
          />
          <Slider
            label="TSP contribution"
            value={
              state.tsp.contributionMode === "percent"
                ? state.tsp.contributionValue
                : Math.min(15, Math.round(effectiveTspPercent(state)))
            }
            min={0}
            max={15}
            format={(v) => `${v}%`}
            onChange={(v) =>
              setState((p) => ({
                ...p,
                tsp: { ...p.tsp, contributionMode: "percent", contributionValue: v, fullMatch: v >= 5 },
              }))
            }
          />
          <Slider
            label="Investment return"
            value={Math.round(state.assumptions.tspReturn * 100)}
            min={4}
            max={10}
            format={(v) => `${v}%`}
            onChange={(v) =>
              setState((p) => ({ ...p, assumptions: { ...p.assumptions, tspReturn: v / 100 } }))
            }
          />
          <Slider
            label="COLA / inflation"
            value={Math.round(state.assumptions.colaRate * 1000) / 10}
            min={1}
            max={4}
            step={0.5}
            format={(v) => `${v.toFixed(1)}%`}
            onChange={(v) =>
              setState((p) => ({ ...p, assumptions: { ...p.assumptions, colaRate: v / 100 } }))
            }
          />
          <Slider
            label="Social Security start age"
            value={ssIndex < 0 ? 0 : ssIndex}
            min={0}
            max={2}
            step={1}
            format={(i) => SS_STOPS[i]?.label ?? ""}
            minLabel="62"
            maxLabel="70"
            disabled={state.federal.system === "CSRS" || state.goals.ssPlan === "no"}
            onChange={(i) =>
              setState((p) => ({ ...p, goals: { ...p.goals, ssStartAge: SS_STOPS[i].value } }))
            }
          />
        </div>
      </div>

      {/* -------- Sections A–F -------- */}
      <div className="space-y-4">
        <Accordion title="A. Your Retirement Eligibility" subtitle="When you can retire under each FERS rule" defaultOpen>
          <EligibilityTimeline
            dob={state.federal.dob}
            scd={state.federal.scd}
            militaryYears={state.federal.militaryYears}
          />
        </Accordion>

        <Accordion title="B. Projected Retirement Income Breakdown" subtitle="Where your monthly income comes from" defaultOpen>
          <IncomeBreakdown
            state={state}
            breakdown={breakdown}
            tspPoints={tspPoints}
            ssEstimate={ssEstimate}
            ssLoading={ssLoading}
            currentAge={currentAge}
          />
        </Accordion>

        <Accordion
          title="C. Gap Analysis"
          subtitle="Target vs projected — and three levers to close the difference"
          defaultOpen
          onFirstOpen={onGapFirstOpen}
        >
          <GapAnalysis
            state={state}
            setState={setState}
            breakdown={breakdown}
            narrative={narrative}
            narrativeLoading={narrativeLoading}
            narrativeError={narrativeError}
            retryNarrative={fetchNarrative}
          />
        </Accordion>

        <Accordion title="D. Risk Analysis" subtitle="FEGLI cost, disability gap, and income protection">
          <RiskAnalysis state={state} currentAge={currentAge} narrative={narrative} />
        </Accordion>

        <Accordion title="E. At Age 57 — What Your Income Could Look Like" subtitle="Your earliest-opportunity snapshot">
          <Age57SnapshotSection state={state} currentAge={currentAge} />
        </Accordion>

        <Accordion title="F. Your Report & Next Steps" subtitle="Download, share, and talk to an advisor" defaultOpen>
          <ReportActions
            pdfProps={pdfProps}
            advisorName={state.advisorName}
            breakdown={breakdown}
            scenarios={scenarios}
            snapshot={snapshot}
            ssEstimate={ssEstimate}
            narrative={narrative}
          />
        </Accordion>
      </div>

      <div className="no-print flex flex-wrap justify-center gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onAdjust}>
          ← Adjust my answers
        </button>
        <button
          type="button"
          className="btn bg-white text-gray-600 border border-gray-300 hover:border-mulberry hover:text-mulberry focus-visible:ring-mulberry"
          onClick={onStartOver}
        >
          Start over
        </button>
      </div>
    </div>
  );
}
