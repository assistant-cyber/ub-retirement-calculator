"use client";

import { useMemo } from "react";
import { age57Snapshot } from "@/lib/gap-analysis";
import { usd, yearsMonthsLabel } from "@/lib/format";
import Callout from "@/components/ui/Callout";
import { toGapInputs, type WizardState } from "@/components/wizard-state";

interface Props {
  state: WizardState;
  currentAge: number;
}

/** Section E: what income could look like at age 57 (MRA for most born 1970+). */
export default function Age57Snapshot({ state, currentAge }: Props) {
  const snap = useMemo(() => age57Snapshot(toGapInputs(state)), [state]);
  const under57 = currentAge < 57;
  const replacementPct = snap.replacementPercentAchieved * 100;
  const inBand = replacementPct >= 70;
  const bandColor =
    replacementPct >= 70 ? "text-green" : replacementPct >= 55 ? "text-[#8a6d10]" : "text-mulberry";

  return (
    <div className="space-y-5">
      {under57 ? (
        <p className="text-gray-700">
          You have <strong>{yearsMonthsLabel(snap.yearsUntil57)}</strong> until you&apos;re first
          eligible. Here&apos;s what your retirement could look like if you retire at your earliest
          opportunity.
        </p>
      ) : (
        <p className="text-gray-700">
          You&apos;re already eligible or approaching eligibility. Here&apos;s what retiring now vs.
          waiting looks like.
        </p>
      )}

      <div className="rounded-xl border border-navy/20 bg-navy/5 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-600">Projected salary at 57</p>
            <p className="text-2xl font-bold text-navy">{usd(snap.projectedSalaryAt57)}</p>
            <p className="text-xs text-gray-500">
              Current salary with 2% annual raises • ~{Math.round(snap.serviceAt57)} years of service
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total monthly income at 57</p>
            <p className="text-2xl font-bold text-navy">{usd(snap.totalMonthly)}/mo</p>
            <p className={`text-sm font-semibold ${bandColor}`}>
              {replacementPct.toFixed(0)}% of your projected salary at 57
              {inBand ? " — inside the 70–80% band" : " — below the recommended 70–80% band"}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-white p-3">
            <p className="text-xs text-gray-500">FERS pension</p>
            <p className="text-lg font-bold text-navy">{usd(snap.pensionMonthly)}/mo</p>
          </div>
          <div className="rounded-lg bg-white p-3">
            <p className="text-xs text-gray-500">FERS supplement (to 62)</p>
            <p className="text-lg font-bold text-navy">{usd(snap.supplementMonthly)}/mo</p>
          </div>
          <div className="rounded-lg bg-white p-3">
            <p className="text-xs text-gray-500">TSP drawdown</p>
            <p className="text-lg font-bold text-navy">{usd(snap.tspMonthly)}/mo</p>
          </div>
        </div>
      </div>

      {!snap.eligible && under57 && (
        <Callout variant="warning">
          At 57 you&apos;d have about {Math.round(snap.serviceAt57)} years of service — short of the
          30 needed for MRA+30 immediate retirement. You&apos;d qualify later under the 60+20 or
          62+5 rules (see the eligibility section above).
        </Callout>
      )}
    </div>
  );
}
