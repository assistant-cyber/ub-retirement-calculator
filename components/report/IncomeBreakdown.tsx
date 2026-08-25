"use client";

import { useMemo, useState } from "react";
import type { IncomeBreakdown as IncomeBreakdownResult, SSEstimateResponse, TSPProjectionPoint } from "@/types/federal";
import { applyCola } from "@/lib/fers-calculations";
import { usd } from "@/lib/format";
import IncomeBreakdownChart, { SOURCE_COLORS } from "@/components/charts/IncomeBreakdownChart";
import TSPGrowthChart from "@/components/charts/TSPGrowthChart";
import Callout from "@/components/ui/Callout";
import type { WizardState } from "@/components/wizard-state";

interface Props {
  state: WizardState;
  breakdown: IncomeBreakdownResult;
  tspPoints: TSPProjectionPoint[];
  ssEstimate: SSEstimateResponse | null;
  ssLoading: boolean;
  currentAge: number;
}

const COLA_OPTIONS = [0.015, 0.02, 0.03];

function SourceCard({
  color,
  title,
  monthly,
  children,
}: {
  color: string;
  title: string;
  monthly: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
        <h4 className="font-heading text-base font-semibold text-navy">{title}</h4>
      </div>
      <p className="mt-2 text-2xl font-bold text-navy">
        {usd(monthly)}
        <span className="text-sm font-normal text-gray-500">/mo</span>
      </p>
      <p className="text-sm text-gray-500">{usd(monthly * 12)}/year</p>
      {children && <div className="mt-2 text-sm text-gray-600">{children}</div>}
    </div>
  );
}

/** Section B: stacked income chart + per-source cards + TSP growth line. */
export default function IncomeBreakdown({
  state,
  breakdown,
  tspPoints,
  ssEstimate,
  ssLoading,
  currentAge,
}: Props) {
  const [cola, setCola] = useState(0.02);
  const retirementAge = state.goals.targetRetirementAge;
  const isCSRS = state.federal.system === "CSRS";
  const yearsToRetire = Math.max(0, retirementAge - currentAge);

  const pensionWithCola = useMemo(
    () => applyCola(breakdown.pensionMonthly, cola, 10),
    [breakdown.pensionMonthly, cola]
  );

  const showBridge = retirementAge < 62 && breakdown.preSSWindow.totalMonthly > 0;
  const chosenSS = breakdown.ssStartAgeNumeric;

  return (
    <div className="space-y-6">
      <IncomeBreakdownChart
        preSS={showBridge ? breakdown.preSSWindow : undefined}
        postSS={breakdown.postSSWindow}
        ssStartAge={chosenSS}
      />
      <p className="text-sm text-gray-600">
        In plain language: {showBridge ? (
          <>
            from retirement at {retirementAge} until age 62 you&apos;d have about{" "}
            <strong>{usd(breakdown.preSSWindow.totalMonthly)}/month</strong> (pension, FERS
            supplement, TSP, and outside income). Once Social Security begins at {chosenSS}, your
            income becomes about <strong>{usd(breakdown.postSSWindow.totalMonthly)}/month</strong>.
          </>
        ) : (
          <>
            after Social Security begins at {chosenSS}, your combined monthly income is projected
            to be about <strong>{usd(breakdown.postSSWindow.totalMonthly)}/month</strong> from
            pension, Social Security, TSP, and outside accounts.
          </>
        )}
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Pension */}
        <SourceCard color={SOURCE_COLORS.pension} title="FERS Basic Pension" monthly={breakdown.pensionMonthly}>
          <p>
            High-3 of {usd(breakdown.high3)} × {Math.round(breakdown.serviceAtRetirement)} years of
            service.
          </p>
          <div className="mt-2">
            <p className="mb-1 text-xs font-semibold text-gray-500">COLA scenario (10-year view):</p>
            <div className="flex gap-1.5" role="group" aria-label="COLA scenario">
              {COLA_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    cola === c
                      ? "border-navy bg-navy text-white"
                      : "border-gray-300 bg-white text-gray-600"
                  }`}
                  aria-pressed={cola === c}
                  onClick={() => setCola(c)}
                >
                  {(c * 100).toFixed(1).replace(/\.0$/, "")}%
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              With {(cola * 100).toFixed(1)}% annual COLA, your pension would be about{" "}
              {usd(pensionWithCola)}/mo ten years into retirement.
            </p>
          </div>
        </SourceCard>

        {/* Supplement */}
        {!isCSRS && breakdown.supplementMonthly > 0 && (
          <SourceCard
            color={SOURCE_COLORS.supplement}
            title="FERS Supplement"
            monthly={breakdown.supplementMonthly}
          >
            <p className="font-semibold text-[#8a6d10]">
              Ends at age 62 when Social Security begins.
            </p>
            <p className="mt-1">
              A bridge from your MRA to 62: (years of FERS service ÷ 40) × your estimated
              Social Security benefit at 62.
            </p>
          </SourceCard>
        )}

        {/* Social Security */}
        <SourceCard color={SOURCE_COLORS.ss} title="Social Security (AI-estimated)" monthly={breakdown.ssMonthly}>
          {isCSRS ? (
            <p>
              CSRS employees are not eligible for the FERS Supplement or Social Security through
              federal service.
            </p>
          ) : ssLoading ? (
            <div className="animate-pulse space-y-2" aria-label="Loading Social Security estimate">
              <div className="h-4 w-3/4 rounded bg-gray-200" />
              <div className="h-4 w-1/2 rounded bg-gray-200" />
            </div>
          ) : ssEstimate ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    [62, ssEstimate.at62],
                    [ssEstimate.fra, ssEstimate.atFRA],
                    [70, ssEstimate.at70],
                  ] as [number, number][]
                ).map(([age, amt]) => {
                  const chosen = age === chosenSS;
                  return (
                    <div
                      key={age}
                      className={`rounded-lg border p-2 text-center ${
                        chosen ? "border-navy bg-navy/5" : "border-gray-200"
                      }`}
                    >
                      <p className="text-xs text-gray-500">At {age}</p>
                      <p className={`text-sm ${chosen ? "font-bold text-navy" : "text-gray-700"}`}>
                        {usd(amt)}
                      </p>
                    </div>
                  );
                })}
              </div>
              {ssEstimate.notes && <p className="mt-2 text-xs text-gray-500">{ssEstimate.notes}</p>}
            </>
          ) : (
            <p>Estimate unavailable — using the standard bend-point approximation.</p>
          )}
        </SourceCard>

        {/* TSP */}
        <SourceCard color={SOURCE_COLORS.tsp} title="TSP Drawdown" monthly={breakdown.tspMonthly}>
          <p>
            Projected balance at retirement: <strong>{usd(breakdown.tspBalanceAtRetirement)}</strong>,
            drawing {Math.round((state.assumptions.withdrawalRate || 0.04) * 100)}%/year (the
            industry-standard safe withdrawal rate).
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {state.tsp.taxType === "roth"
              ? "Roth TSP withdrawals are generally tax-free in retirement (contributions were after-tax)."
              : state.tsp.taxType === "split"
                ? "Your split Roth/Traditional balance means part of each withdrawal is tax-free and part is taxed as ordinary income."
                : "Traditional TSP withdrawals are taxed as ordinary income in retirement."}
          </p>
        </SourceCard>

        {/* Outside */}
        {breakdown.outsideMonthly > 0 && (
          <SourceCard color={SOURCE_COLORS.outside} title="Outside Accounts & Other Income" monthly={breakdown.outsideMonthly}>
            <p>
              Savings outside TSP, prior pensions
              {state.federal.maritalStatus === "married" ? ", and spouse income" : ""}.
            </p>
          </SourceCard>
        )}
      </div>

      {/* TSP growth */}
      <div>
        <h4 className="mb-2 font-heading text-base font-semibold text-navy">
          TSP growth to retirement
        </h4>
        {yearsToRetire >= 1 ? (
          <TSPGrowthChart points={tspPoints} />
        ) : (
          <Callout variant="info">
            You&apos;re at (or past) your target retirement age, so we show your current balance of{" "}
            {usd(state.tsp.balance)} without further growth.
          </Callout>
        )}
      </div>
    </div>
  );
}
