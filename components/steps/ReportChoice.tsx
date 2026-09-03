"use client";

import { useMemo } from "react";
import {
  eligibilityScenarios,
  yearsOfService,
  mraForBirthYear,
  fersPension,
  ageAt,
  high3,
} from "@/lib/fers-calculations";
import { fegliAnnualCost, fegliCoverageAmount } from "@/lib/fegli-rates";
import { agencyMatch, missedMatch } from "@/lib/tsp-projections";
import { usd, formatDateLong } from "@/lib/format";
import type { WizardState } from "@/components/wizard-state";

interface Props {
  state: WizardState;
  onMiniReport: () => void;
  onFullReport: () => void;
  onBack: () => void;
}

/**
 * Branch point after Step 2 (Benefits). Shows a quick eligibility snapshot
 * and lets the user choose between a Mini Report (quick) or continuing
 * for the Full In-Depth Report.
 */
export default function ReportChoice({ state, onMiniReport, onFullReport, onBack }: Props) {
  const { federal, tsp, fegli } = state;

  const currentAge = useMemo(() => ageAt(federal.dob, new Date()), [federal.dob]);
  const birthYear = federal.dob ? new Date(`${federal.dob}T00:00:00`).getFullYear() : 1970;
  const mra = mraForBirthYear(birthYear);
  const service = yearsOfService(federal.scd, new Date());

  // Eligibility scenarios
  const scenarios = useMemo(
    () => eligibilityScenarios(federal.dob, federal.scd, federal.militaryYears),
    [federal.dob, federal.scd, federal.militaryYears]
  );

  // Find first eligible scenario (the one marked as earliest)
  const firstEligible = scenarios.find((s) => s.earliest);
  const eligibilityStatus = firstEligible?.rule ?? "Not yet eligible";
  const eligibilityDate = firstEligible?.eligibleDate ?? null;

  // Quick pension estimate at first eligible date
  const pensionEstimate = useMemo(() => {
    if (!firstEligible) return null;
    const retireAge = firstEligible.ageAtDate;
    const serviceAtRetire = firstEligible.serviceAtDate;
    const yearsUntil = firstEligible.yearsUntil;
    const projectedHigh3 = high3(federal.salary, yearsUntil);
    return fersPension(projectedHigh3, serviceAtRetire, retireAge);
  }, [firstEligible, federal.salary]);

  // TSP match check
  const tspPct =
    tsp.contributionMode === "percent"
      ? tsp.contributionValue
      : federal.salary > 0
        ? (tsp.contributionValue / federal.salary) * 100
        : 0;
  const matchTotal = agencyMatch(federal.salary, tspPct);
  const matchMissed = missedMatch(federal.salary, tspPct);
  const gettingFullMatch = tspPct >= 5;

  // FEGLI cost
  const fegliCost = fegliAnnualCost(fegli, currentAge, federal.salary);
  const fegliCoverage = fegliCoverageAmount(fegli, federal.salary);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="card border-l-4 border-l-gold bg-gradient-to-r from-gold/5 to-transparent">
        <h2 className="text-2xl font-bold text-navy">
          Great progress! Here&apos;s your eligibility snapshot.
        </h2>
        <p className="mt-2 text-gray-600">
          Based on what you&apos;ve told us, we can already show you some key information
          about your federal retirement.
        </p>
      </div>

      {/* Eligibility Snapshot */}
      <div className="card">
        <h3 className="mb-4 text-lg font-bold text-navy">FERS Retirement Eligibility</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Your MRA</p>
            <p className="text-2xl font-bold text-navy">Age {mra}</p>
            <p className="text-xs text-gray-400">Born {birthYear}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Current Service</p>
            <p className="text-2xl font-bold text-navy">{service.toFixed(1)} years</p>
            <p className="text-xs text-gray-400">Since {formatDateLong(federal.scd)}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-500">First Eligible</p>
            <p className="text-2xl font-bold text-green">{eligibilityStatus}</p>
            {eligibilityDate && (
              <p className="text-xs text-gray-400">{formatDateLong(eligibilityDate)}</p>
            )}
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Est. Monthly Pension</p>
            <p className="text-2xl font-bold text-navy">
              {pensionEstimate ? usd(pensionEstimate.monthly) : "—"}
            </p>
            <p className="text-xs text-gray-400">At first eligible date</p>
          </div>
        </div>

        {/* Quick eligibility rules reminder */}
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-semibold text-gray-700">FERS Eligibility Rules:</p>
          <ul className="mt-2 space-y-1 text-sm text-gray-600">
            <li>• <strong>MRA + 30 years</strong> — Unreduced pension</li>
            <li>• <strong>Age 60 + 20 years</strong> — Unreduced pension</li>
            <li>• <strong>Age 62 + 5 years</strong> — Unreduced pension</li>
            <li>• <strong>MRA + 10 years</strong> — Reduced (5% per year under 62)</li>
          </ul>
        </div>
      </div>

      {/* Benefits Quick View */}
      <div className="card">
        <h3 className="mb-4 text-lg font-bold text-navy">Benefits Snapshot</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-700">TSP Balance</p>
            <p className="text-xl font-bold text-navy">{usd(tsp.balance)}</p>
            <p className={`text-sm ${gettingFullMatch ? "text-green" : "text-mulberry"}`}>
              {gettingFullMatch
                ? `✓ Getting full 5% match (${usd(matchTotal)}/yr)`
                : `⚠ Missing ${usd(matchMissed)}/yr in match`}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-700">FEGLI Coverage</p>
            <p className="text-xl font-bold text-navy">{usd(fegliCoverage)}</p>
            <p className="text-sm text-gray-500">
              {usd(fegliCost)}/year premium
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-700">Annual Salary</p>
            <p className="text-xl font-bold text-navy">{usd(federal.salary)}</p>
            <p className="text-sm text-gray-500">
              {federal.maritalStatus === "married" ? "Married" : "Single"}, {federal.dependents} dependent(s)
            </p>
          </div>
        </div>
      </div>

      {/* Choice Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Mini Report Option */}
        <div className="card border-2 border-gray-200 hover:border-gold transition-colors">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/20 text-xl">
              ⚡
            </span>
            <h3 className="text-xl font-bold text-navy">Mini Report</h3>
          </div>
          <p className="mb-4 text-gray-600">
            Get a quick eligibility summary PDF with your basic pension estimate,
            TSP snapshot, and FEGLI overview.
          </p>
          <ul className="mb-6 space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <span className="text-green">✓</span> Retirement eligibility dates
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green">✓</span> Basic pension estimate
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green">✓</span> TSP balance & match status
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green">✓</span> FEGLI coverage summary
            </li>
          </ul>
          <button
            type="button"
            onClick={onMiniReport}
            className="btn-secondary w-full"
          >
            Get Mini Report
          </button>
          <p className="mt-2 text-center text-xs text-gray-400">Takes about 30 seconds</p>
        </div>

        {/* Full Report Option */}
        <div className="card border-2 border-mulberry bg-gradient-to-br from-mulberry/5 to-transparent">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mulberry/20 text-xl">
              📊
            </span>
            <div>
              <h3 className="text-xl font-bold text-navy">Full In-Depth Report</h3>
              <span className="text-xs font-semibold text-mulberry">RECOMMENDED</span>
            </div>
          </div>
          <p className="mb-4 text-gray-600">
            Answer a few more questions about your goals and outside savings for a
            comprehensive retirement analysis.
          </p>
          <ul className="mb-6 space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <span className="text-green">✓</span> Everything in Mini Report
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green">✓</span> Income gap analysis
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green">✓</span> TSP growth projections
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green">✓</span> Social Security scenarios
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green">✓</span> FEGLI vs. private insurance comparison
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green">✓</span> Personalized AI-powered insights
            </li>
          </ul>
          <button
            type="button"
            onClick={onFullReport}
            className="btn-primary w-full"
          >
            Continue for Full Report
          </button>
          <p className="mt-2 text-center text-xs text-gray-400">Just 2 more quick steps</p>
        </div>
      </div>

      {/* Back button */}
      <div className="flex justify-start">
        <button type="button" onClick={onBack} className="btn-link">
          ← Back to Benefits
        </button>
      </div>
    </div>
  );
}
