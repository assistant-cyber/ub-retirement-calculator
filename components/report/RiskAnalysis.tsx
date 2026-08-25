"use client";

import { useMemo } from "react";
import type { GapNarrativeResponse } from "@/types/federal";
import {
  fegliAnnualCost,
  fegliCostOverYears,
  fegliCoverageAmount,
  privateTermEstimate,
  underinsuredCheck,
} from "@/lib/fegli-rates";
import { disabilityGap } from "@/lib/tsp-projections";
import { mraForBirthYear } from "@/lib/fers-calculations";
import { usd, usdCents } from "@/lib/format";
import FEGLIComparisonChart from "@/components/charts/FEGLIComparisonChart";
import Callout from "@/components/ui/Callout";
import type { WizardState } from "@/components/wizard-state";

interface Props {
  state: WizardState;
  currentAge: number;
  narrative: GapNarrativeResponse | null;
}

const AGE_BANDS = [45, 50, 55, 60, 65];

/** Section D: FEGLI vs private term, disability gap, underinsured check. */
export default function RiskAnalysis({ state, currentAge, narrative }: Props) {
  const { fegli, federal } = state;
  const age = Math.floor(currentAge);

  const data = useMemo(() => {
    const fegliAnnual = fegliAnnualCost(fegli, currentAge, federal.salary);
    const fegliPoints = fegliCostOverYears(fegli, currentAge, federal.salary, 20);
    const coverage = fegliCoverageAmount(fegli, federal.salary);
    const privateAnnual = privateTermEstimate(currentAge, coverage, 20);
    const fegliTotal = fegliPoints.reduce((s, p) => s + p.annualCost, 0);
    const underinsured = underinsuredCheck(coverage, federal.salary);
    const birthYear = new Date(`${federal.dob}T00:00:00`).getFullYear();
    const mra = mraForBirthYear(birthYear);
    const disability = disabilityGap(federal.salary, currentAge, mra);
    return { fegliAnnual, fegliPoints, coverage, privateAnnual, fegliTotal, underinsured, disability };
  }, [fegli, federal, currentAge]);

  const nextBand = AGE_BANDS.find((b) => b > age);
  const hasFegli = fegli.enrollment !== "none";

  return (
    <div className="space-y-8">
      {/* FEGLI vs private */}
      <div className="space-y-4">
        <h4 className="font-heading text-lg font-semibold text-navy">
          Life insurance: FEGLI vs. private term
        </h4>
        {hasFegli ? (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-600">Current annual FEGLI cost</p>
                <p className="mt-1 text-2xl font-bold text-mulberry">{usdCents(data.fegliAnnual)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-600">20-year FEGLI total (as you age)</p>
                <p className="mt-1 text-2xl font-bold text-mulberry">{usd(data.fegliTotal)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-600">20-year private term estimate</p>
                <p className="mt-1 text-2xl font-bold text-navy">{usd(data.privateAnnual * 20)}</p>
                <p className="text-xs text-gray-500">for {usd(data.coverage)} of coverage</p>
              </div>
            </div>

            {state.seeFegliComparison && (
              <FEGLIComparisonChart fegliPoints={data.fegliPoints} privateAnnual={data.privateAnnual} />
            )}

            <Callout variant="warning" title="FEGLI premiums jump with age">
              FEGLI Option B premiums increase dramatically at ages 45, 50, 55, 60, and 65 —
              {nextBand
                ? ` your next jump is at age ${nextBand}.`
                : " you are already in the highest age bands."}{" "}
              Private term premiums are typically level for the entire term.
            </Callout>

            <Callout variant="info">
              At your age, a private 20-year term policy may be significantly cheaper. A United
              Benefits advisor can run a side-by-side comparison. You can also check{" "}
              <a
                href="https://www.opm.gov/retirement-center/calculators/fegli-calculator/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-navy underline"
              >
                OPM&apos;s FEGLI calculator
              </a>{" "}
              or your agency&apos;s{" "}
              <a
                href="https://www.grbinc.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-navy underline"
              >
                GRB Platform
              </a>
              .
            </Callout>
          </>
        ) : (
          <Callout variant="warning" title="No FEGLI coverage on record">
            If anyone depends on your income, life insurance is usually the most affordable way to
            protect them. A United Benefits advisor can compare your options.
          </Callout>
        )}
      </div>

      {/* Disability */}
      <div className="space-y-4">
        <h4 className="font-heading text-lg font-semibold text-navy">Disability insurance gap</h4>
        <p className="text-gray-700">
          Your income is your biggest asset. Federal employees do <strong>NOT</strong> receive
          disability insurance through their benefits package.
        </p>
        <div className="rounded-xl border border-mulberry/40 bg-mulberry/5 p-5 text-center">
          <p className="text-sm text-gray-600">
            Estimated career earnings remaining (to your MRA, ~
            {Math.round(data.disability.yearsToMra)} years)
          </p>
          <p className="mt-1 font-heading text-3xl font-bold text-mulberry">
            {usd(data.disability.careerEarningsRemaining)} at risk
          </p>
          <p className="mt-2 text-sm text-gray-600">
            If you became disabled tomorrow, your family could lose up to{" "}
            {usd(data.disability.careerEarningsRemaining)} in income.
          </p>
        </div>
        <Callout variant="info" title="FERS disability retirement (if applicable)">
          FERS disability retirement typically pays about 60% of your High-3 in year 1 (~
          {usd(data.disability.fersDisabilityYear1)}/yr for you) and 40% thereafter (~
          {usd(data.disability.fersDisabilityAfter)}/yr) — a significant cut from your full salary.
        </Callout>
        <p className="font-semibold text-navy">
          Ask your advisor about private disability insurance options.
        </p>
      </div>

      {/* Underinsured check */}
      <div className="space-y-3">
        <h4 className="font-heading text-lg font-semibold text-navy">Underinsured check</h4>
        {data.underinsured.insured ? (
          <Callout variant="success" title="Coverage meets the 10× income rule of thumb">
            Your total death benefit of {usd(data.coverage)} meets the commonly recommended 10×
            income level ({usd(data.underinsured.recommended)}).
          </Callout>
        ) : (
          <Callout variant="alert" title="You may be underinsured">
            Your total death benefit of {usd(data.coverage)} is {usd(data.underinsured.shortfall)}{" "}
            below the commonly recommended 10× income level ({usd(data.underinsured.recommended)}).
          </Callout>
        )}
      </div>

      {/* Risk narrative */}
      {narrative?.riskNarrative && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
          <h4 className="mb-2 font-heading text-base font-semibold text-navy">
            Your risk picture, in plain English
          </h4>
          <p className="leading-relaxed text-gray-700">{narrative.riskNarrative}</p>
        </div>
      )}
    </div>
  );
}
