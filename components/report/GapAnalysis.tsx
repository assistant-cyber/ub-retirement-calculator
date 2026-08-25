"use client";

import { useMemo, useRef } from "react";
import type { GapNarrativeResponse, IncomeBreakdown as IncomeBreakdownResult } from "@/types/federal";
import { computeIncomeBreakdown } from "@/lib/gap-analysis";
import { missedMatch, missedMatchFutureValue } from "@/lib/tsp-projections";
import { usd } from "@/lib/format";
import Slider from "@/components/ui/Slider";
import Callout from "@/components/ui/Callout";
import { effectiveTspPercent, toGapInputs, type WizardState } from "@/components/wizard-state";

interface Props {
  state: WizardState;
  setState: (updater: (prev: WizardState) => WizardState) => void;
  breakdown: IncomeBreakdownResult;
  narrative: GapNarrativeResponse | null;
  narrativeLoading: boolean;
  narrativeError: boolean;
  retryNarrative: () => void;
}

/** Section C: target vs projected vs gap, live levers, TSP-match alert, AI narrative. */
export default function GapAnalysis({
  state,
  setState,
  breakdown,
  narrative,
  narrativeLoading,
  narrativeError,
  retryNarrative,
}: Props) {
  const gap = breakdown.gapMonthly;
  const hasGap = gap > 0;
  const tspPct = effectiveTspPercent(state);

  // Baseline lever values captured on first render — lever rows show their
  // live effect relative to where the user started.
  const baseline = useRef({
    retirementAge: state.goals.targetRetirementAge,
    tspPercent: state.tsp.contributionMode === "percent" ? state.tsp.contributionValue : Math.round(tspPct),
    replacementPercent: state.goals.replacementPercent,
  });

  const leverEffect = useMemo(() => {
    const b = baseline.current;
    const inputs = toGapInputs(state);

    const gapAt = (patch: Partial<typeof inputs.assumptions>, tspValue?: number) =>
      computeIncomeBreakdown({
        ...inputs,
        tsp:
          tspValue !== undefined
            ? { ...inputs.tsp, contributionMode: "percent", contributionValue: tspValue }
            : inputs.tsp,
        assumptions: { ...inputs.assumptions, ...patch },
      }).gapMonthly;

    return {
      workLonger:
        gapAt({ retirementAge: b.retirementAge }) - breakdown.gapMonthly,
      saveMore: gapAt({}, b.tspPercent) - breakdown.gapMonthly,
      lowerTarget:
        gapAt({ replacementPercent: b.replacementPercent }) - breakdown.gapMonthly,
    };
  }, [state, breakdown.gapMonthly]);

  // Meter: projected as % of target
  const pctOfTarget =
    breakdown.targetMonthly > 0
      ? Math.min(150, (breakdown.totalMonthly / breakdown.targetMonthly) * 100)
      : 100;

  const missedAnnual = missedMatch(state.federal.salary, tspPct);
  const missedFV = missedMatchFutureValue(state.federal.salary, tspPct, 20, 0.06);

  const replacementDisplay = Math.round(state.goals.replacementPercent * 100);

  return (
    <div className="space-y-6">
      {/* Headline cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-600">Your target retirement income</p>
          <p className="mt-1 text-2xl font-bold text-navy">{usd(breakdown.targetMonthly)}/mo</p>
          <p className="text-xs text-gray-500">
            {replacementDisplay}% of your projected final salary ({usd(breakdown.projectedFinalSalary)})
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-600">Your projected retirement income</p>
          <p className="mt-1 text-2xl font-bold text-navy">{usd(breakdown.totalMonthly)}/mo</p>
          <p className="text-xs text-gray-500">Pension + supplement/SS + TSP + outside</p>
        </div>
        <div
          className={`rounded-xl border p-4 ${
            hasGap ? "border-mulberry/40 bg-mulberry/5" : "border-green/40 bg-green/5"
          }`}
        >
          <p className="text-sm text-gray-600">{hasGap ? "Gap to close" : "Surplus"}</p>
          <p className={`mt-1 text-2xl font-bold ${hasGap ? "text-mulberry" : "text-green"}`}>
            {usd(Math.abs(gap))}/mo
          </p>
          <p className="text-xs text-gray-500">
            {hasGap ? "Target minus projected income" : "You're projected above your target"}
          </p>
        </div>
      </div>

      {/* Meter */}
      <div>
        <div className="mb-1 flex justify-between text-sm">
          <span className={`font-semibold ${hasGap ? "text-mulberry" : "text-green"}`}>
            {Math.round(pctOfTarget)}% of target
          </span>
          <span className="text-gray-500">Target: {usd(breakdown.targetMonthly)}/mo</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${
              hasGap ? "bg-mulberry" : "bg-green"
            }`}
            style={{ width: `${Math.min(100, pctOfTarget)}%` }}
          />
        </div>
      </div>

      {/* Levers */}
      {hasGap ? (
        <div className="space-y-5 rounded-xl bg-ivory p-4 sm:p-5">
          <h4 className="font-heading text-base font-semibold text-navy">
            Three ways to close your gap — move a slider and watch every number update
          </h4>

          <div>
            <Slider
              label="1. Work longer (retirement age)"
              value={state.goals.targetRetirementAge}
              min={50}
              max={72}
              onChange={(v) =>
                setState((prev) => ({
                  ...prev,
                  goals: { ...prev.goals, targetRetirementAge: v },
                }))
              }
            />
            {state.goals.targetRetirementAge !== baseline.current.retirementAge && (
              <p className="mt-1 text-sm font-semibold text-navy">
                Retiring at {state.goals.targetRetirementAge} instead of{" "}
                {baseline.current.retirementAge}{" "}
                {leverEffect.workLonger > 0
                  ? `closes ${usd(leverEffect.workLonger)}/mo of the gap.`
                  : `widens the gap by ${usd(-leverEffect.workLonger)}/mo.`}
              </p>
            )}
          </div>

          <div>
            <Slider
              label="2. Save more (TSP contribution)"
              value={
                state.tsp.contributionMode === "percent"
                  ? state.tsp.contributionValue
                  : Math.min(15, Math.round(tspPct))
              }
              min={0}
              max={15}
              format={(v) => `${v}%`}
              onChange={(v) =>
                setState((prev) => ({
                  ...prev,
                  tsp: {
                    ...prev.tsp,
                    contributionMode: "percent",
                    contributionValue: v,
                    fullMatch: v >= 5,
                  },
                }))
              }
            />
            {Math.round(tspPct) !== baseline.current.tspPercent && (
              <p className="mt-1 text-sm font-semibold text-navy">
                Contributing {Math.round(tspPct)}% instead of {baseline.current.tspPercent}%{" "}
                {leverEffect.saveMore > 0
                  ? `closes ${usd(leverEffect.saveMore)}/mo of the gap`
                  : `changes the gap by ${usd(-leverEffect.saveMore)}/mo`}{" "}
                (projected TSP at retirement: {usd(breakdown.tspBalanceAtRetirement)}).
              </p>
            )}
          </div>

          <div>
            <Slider
              label="3. Lower your target (income replacement)"
              value={replacementDisplay}
              min={50}
              max={100}
              format={(v) => `${v}%`}
              onChange={(v) =>
                setState((prev) => ({
                  ...prev,
                  goals: { ...prev.goals, replacementPercent: v / 100 },
                }))
              }
            />
            {state.goals.replacementPercent !== baseline.current.replacementPercent && (
              <p className="mt-1 text-sm font-semibold text-navy">
                Targeting {replacementDisplay}% instead of{" "}
                {Math.round(baseline.current.replacementPercent * 100)}%{" "}
                {leverEffect.lowerTarget > 0
                  ? `closes ${usd(leverEffect.lowerTarget)}/mo of the gap.`
                  : `changes the gap by ${usd(-leverEffect.lowerTarget)}/mo.`}
              </p>
            )}
          </div>
        </div>
      ) : (
        <Callout variant="success" title="You're on track">
          Your projected income meets or exceeds your target. Use the assumptions panel above to
          stress-test different retirement ages, returns, and inflation.
        </Callout>
      )}

      {/* TSP match alert */}
      {missedAnnual > 0 && (
        <Callout variant="alert" title="You're missing free agency match">
          By not contributing 5%, you are missing {usd(missedAnnual)}/year in free agency match.
          Over 20 years at 6% growth, that&apos;s {usd(missedFV)}.
        </Callout>
      )}

      {/* AI narrative */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
        <h4 className="mb-2 font-heading text-base font-semibold text-navy">
          What this means for you
        </h4>
        {narrativeLoading ? (
          <div className="animate-pulse space-y-2" aria-label="Loading personalized summary">
            <div className="h-4 w-full rounded bg-gray-200" />
            <div className="h-4 w-5/6 rounded bg-gray-200" />
            <div className="h-4 w-2/3 rounded bg-gray-200" />
          </div>
        ) : narrativeError ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              We couldn&apos;t generate your personalized summary right now — your numbers above are
              unaffected.
            </p>
            <button type="button" className="btn-secondary" onClick={retryNarrative}>
              Try again
            </button>
          </div>
        ) : narrative ? (
          <div className="space-y-4">
            <p className="leading-relaxed text-gray-700">{narrative.gapNarrative}</p>
            {narrative.topRecommendations.length > 0 && (
              <div>
                <h5 className="mb-2 font-semibold text-navy">Top recommendations</h5>
                <ol className="space-y-2">
                  {narrative.topRecommendations.map((r, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="text-sm text-gray-700">
                        <strong className="text-navy">{r.title}.</strong> {r.detail}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-600">Open this section to generate your summary.</p>
        )}
      </div>
    </div>
  );
}
