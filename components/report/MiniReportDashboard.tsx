"use client";

import { useMemo, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
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
import Accordion from "@/components/ui/Accordion";
import EligibilityTimeline from "@/components/report/EligibilityTimeline";
import type { WizardState } from "@/components/wizard-state";

const MiniReportPDF = dynamic(() => import("@/components/MiniReportPDF"), {
  ssr: false,
  loading: () => (
    <button disabled className="btn-primary w-full opacity-50">
      Loading PDF...
    </button>
  ),
});

interface Props {
  state: WizardState;
  onContinueToFull: () => void;
  onStartOver: () => void;
}

/**
 * Mini Report Dashboard — shown when user chooses the quick report option.
 * Displays eligibility, basic pension, TSP, FEGLI, and a CTA to continue
 * for the full analysis or schedule with an advisor.
 */
export default function MiniReportDashboard({ state, onContinueToFull, onStartOver }: Props) {
  const { federal, tsp, fegli } = state;

  const currentAge = useMemo(() => ageAt(federal.dob, new Date()), [federal.dob]);
  const birthYear = federal.dob ? new Date(`${federal.dob}T00:00:00`).getFullYear() : 1970;
  const mra = mraForBirthYear(birthYear);
  const service = yearsOfService(federal.scd, new Date());

  const scenarios = useMemo(
    () => eligibilityScenarios(federal.dob, federal.scd, federal.militaryYears),
    [federal.dob, federal.scd, federal.militaryYears]
  );

  // Find first eligible (earliest) scenario
  const firstEligible = scenarios.find((s) => s.earliest);
  const eligibilityLabel = firstEligible?.rule ?? "Not yet eligible";

  const pensionEstimate = useMemo(() => {
    if (!firstEligible) return null;
    const retireAge = firstEligible.ageAtDate;
    const serviceAtRetire = firstEligible.serviceAtDate;
    const yearsUntil = firstEligible.yearsUntil;
    const projectedHigh3 = high3(federal.salary, yearsUntil);
    return fersPension(projectedHigh3, serviceAtRetire, retireAge);
  }, [firstEligible, federal.salary]);

  const tspPct =
    tsp.contributionMode === "percent"
      ? tsp.contributionValue
      : federal.salary > 0
        ? (tsp.contributionValue / federal.salary) * 100
        : 0;
  const matchTotal = agencyMatch(federal.salary, tspPct);
  const matchMissed = missedMatch(federal.salary, tspPct);
  const gettingFullMatch = tspPct >= 5;

  const fegliCost = fegliAnnualCost(fegli, currentAge, federal.salary);
  const fegliCoverage = fegliCoverageAmount(fegli, federal.salary);

  // Save mini report submission
  const submissionSaved = useRef(false);
  useEffect(() => {
    if (submissionSaved.current) return;
    submissionSaved.current = true;
    let intake: unknown = null;
    try {
      intake = JSON.parse(window.sessionStorage.getItem("ub-intake") ?? "null");
    } catch {
      intake = null;
    }
    if (!intake) return;
    fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intake,
        state,
        results: {
          reportType: "mini",
          mra,
          service,
          eligibilityStatus: eligibilityLabel,
          pensionMonthly: pensionEstimate?.monthly ?? 0,
          tspBalance: tsp.balance,
          fegliCoverage,
        },
        aiNarratives: null,
      }),
    }).catch(() => undefined);
  }, [state, mra, service, eligibilityLabel, pensionEstimate, tsp.balance, fegliCoverage]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="card border-l-4 border-l-gold">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy sm:text-3xl">
              Your Mini Retirement Report
            </h1>
            <p className="mt-1 text-gray-600">
              A quick snapshot of your federal retirement eligibility and benefits.
            </p>
          </div>
          <MiniReportPDF
            state={state}
            mra={mra}
            service={service}
            eligibilityStatus={eligibilityLabel}
            eligibilityDate={firstEligible?.eligibleDate ?? null}
            pensionMonthly={pensionEstimate?.monthly ?? 0}
            fegliCoverage={fegliCoverage}
            fegliCost={fegliCost}
            gettingFullMatch={gettingFullMatch}
            matchTotal={matchTotal}
            matchMissed={matchMissed}
          />
        </div>
      </div>

      {/* Section A: Eligibility */}
      <Accordion title="A. FERS Retirement Eligibility" defaultOpen>
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-navy/5 p-4">
              <p className="text-sm text-gray-500">Your MRA</p>
              <p className="text-2xl font-bold text-navy">Age {mra}</p>
            </div>
            <div className="rounded-lg bg-navy/5 p-4">
              <p className="text-sm text-gray-500">Current Service</p>
              <p className="text-2xl font-bold text-navy">{service.toFixed(1)} years</p>
            </div>
            <div className="rounded-lg bg-green/10 p-4">
              <p className="text-sm text-gray-500">First Eligible</p>
              <p className="text-2xl font-bold text-green">{eligibilityLabel}</p>
              {firstEligible?.eligibleDate && (
                <p className="text-sm text-gray-500">{formatDateLong(firstEligible.eligibleDate)}</p>
              )}
            </div>
            <div className="rounded-lg bg-navy/5 p-4">
              <p className="text-sm text-gray-500">Est. Monthly Pension</p>
              <p className="text-2xl font-bold text-navy">
                {pensionEstimate ? usd(pensionEstimate.monthly) : "—"}
              </p>
            </div>
          </div>

          <EligibilityTimeline
            dob={federal.dob}
            scd={federal.scd}
            militaryYears={federal.militaryYears}
          />

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-700">FERS Eligibility Rules:</p>
            <div className="mt-2 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
              <div>• <strong>MRA + 30 years</strong> — Unreduced pension</div>
              <div>• <strong>Age 60 + 20 years</strong> — Unreduced pension</div>
              <div>• <strong>Age 62 + 5 years</strong> — Unreduced pension</div>
              <div>• <strong>MRA + 10 years</strong> — Reduced (5%/yr under 62)</div>
            </div>
          </div>
        </div>
      </Accordion>

      {/* Section B: TSP */}
      <Accordion title="B. TSP Summary" defaultOpen>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">Current Balance</p>
            <p className="text-3xl font-bold text-navy">{usd(tsp.balance)}</p>
            <p className="mt-1 text-sm text-gray-500">
              Contributing {tspPct.toFixed(1)}% ({tsp.taxType})
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Agency Match</p>
            <p className={`text-xl font-bold ${gettingFullMatch ? "text-green" : "text-mulberry"}`}>
              {gettingFullMatch ? (
                <>✓ Full match: {usd(matchTotal)}/year</>
              ) : (
                <>⚠ Missing {usd(matchMissed)}/year</>
              )}
            </p>
            {!gettingFullMatch && (
              <p className="mt-1 text-sm text-gray-500">
                Increase to 5% to maximize your free money
              </p>
            )}
          </div>
        </div>
      </Accordion>

      {/* Section C: FEGLI */}
      <Accordion title="C. FEGLI Life Insurance" defaultOpen>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">Current Coverage</p>
            <p className="text-3xl font-bold text-navy">{usd(fegliCoverage)}</p>
            <p className="mt-1 text-sm text-gray-500">
              Enrollment: {fegli.enrollment.toUpperCase()}
              {fegli.optionBMultiple > 0 && ` (${fegli.optionBMultiple}x Option B)`}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Annual Premium</p>
            <p className="text-xl font-bold text-navy">{usd(fegliCost)}/year</p>
            <p className="mt-1 text-sm text-gray-500">
              {usd(fegliCost / 12)}/month
            </p>
          </div>
        </div>
      </Accordion>

      {/* CTA Section */}
      <div className="card border-2 border-mulberry bg-gradient-to-br from-mulberry/5 to-transparent">
        <h3 className="text-xl font-bold text-navy">Want the full picture?</h3>
        <p className="mt-2 text-gray-600">
          Your Mini Report covers the basics. For a complete analysis including income gap projections,
          TSP growth scenarios, Social Security timing strategies, and personalized AI insights,
          continue to the Full In-Depth Report.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <button type="button" onClick={onContinueToFull} className="btn-primary">
            Continue for Full Report →
          </button>
          <button type="button" onClick={onStartOver} className="btn-secondary">
            Start Over
          </button>
        </div>
      </div>

      {/* Advisor CTA */}
      <div className="card bg-navy text-white">
        <h3 className="text-xl font-bold">Ready to talk to an advisor?</h3>
        <p className="mt-2 text-white/80">
          Schedule a free consultation with {state.advisorName !== "Not sure / Assign me one" ? state.advisorName : "a United Benefits advisor"} to
          discuss your retirement plan.
        </p>
        <div className="mt-4">
          <a
            href="https://calendly.com/unitedbenefits"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-lg bg-white px-6 py-3 font-semibold text-navy hover:bg-gray-100"
          >
            Schedule a Call
          </a>
        </div>
      </div>
    </div>
  );
}
