"use client";

import { mraForBirthYear, mraLabel, SS_FRA } from "@/lib/fers-calculations";
import type { SSStartAge } from "@/types/federal";
import Slider from "@/components/ui/Slider";
import Callout from "@/components/ui/Callout";
import type { WizardState } from "@/components/wizard-state";

interface Props {
  state: WizardState;
  setState: (updater: (prev: WizardState) => WizardState) => void;
  onNext: () => void;
  onBack: () => void;
}

const LIFESTYLES: { label: string; pct: number; blurb: string }[] = [
  { label: "Conservative", pct: 70, blurb: "Simple, low-cost lifestyle" },
  { label: "Comfortable", pct: 80, blurb: "Maintain your current lifestyle" },
  { label: "Active", pct: 90, blurb: "Travel, hobbies, and more" },
];

const SS_STOPS: { value: SSStartAge; label: string }[] = [
  { value: 62, label: "62 (earliest)" },
  { value: "fra", label: `FRA (${SS_FRA})` },
  { value: 70, label: "70 (max)" },
];

export default function Step3Goals({ state, setState, onNext, onBack }: Props) {
  const { goals, federal } = state;
  const setGoals = (patch: Partial<WizardState["goals"]>) =>
    setState((prev) => ({ ...prev, goals: { ...prev.goals, ...patch } }));

  const birthYear = federal.dob ? new Date(`${federal.dob}T00:00:00`).getFullYear() : null;
  const mra = birthYear ? mraForBirthYear(birthYear) : null;
  const isCSRS = federal.system === "CSRS";

  const ssIndex = SS_STOPS.findIndex((s) => s.value === goals.ssStartAge);

  return (
    <div className="card space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Your retirement goals</h2>
        <p className="mt-1 text-gray-600">
          Set your targets — you can fine-tune all of these later, live on your report.
        </p>
      </div>

      <div className="space-y-3">
        <Slider
          label="Target retirement age"
          value={goals.targetRetirementAge}
          min={50}
          max={72}
          step={1}
          onChange={(v) => setGoals({ targetRetirementAge: v })}
          marker={
            mra !== null && mra >= 50 && mra <= 72
              ? { value: mra, label: `Your MRA (${birthYear ? mraLabel(birthYear) : ""})` }
              : undefined
          }
        />
        {birthYear && mra !== null ? (
          <Callout variant="info">
            Your Minimum Retirement Age is <strong>{mraLabel(birthYear)}</strong> (born {birthYear}
            ). The gold marker on the slider shows where your MRA falls.
            {goals.targetRetirementAge < mra && (
              <>
                {" "}
                Retiring at {goals.targetRetirementAge} is before your MRA — regular FERS
                retirement isn&apos;t available that early.
              </>
            )}
          </Callout>
        ) : (
          <Callout variant="info">
            Enter your date of birth in Step 1 and we&apos;ll show your Minimum Retirement Age
            (MRA) here.
          </Callout>
        )}
      </div>

      <div>
        <Slider
          label="What percentage of your current salary do you want in retirement?"
          value={Math.round(goals.replacementPercent * 100)}
          min={50}
          max={100}
          step={1}
          format={(v) => `${v}%`}
          onChange={(v) => setGoals({ replacementPercent: v / 100 })}
          note="Most financial planners recommend 70–80% to maintain your standard of living."
        />
        <div className="mt-4">
          <span className="label">How do you see your retirement?</span>
          <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="Retirement lifestyle">
            {LIFESTYLES.map((l) => {
              const active = Math.round(goals.replacementPercent * 100) === l.pct;
              return (
                <button
                  key={l.label}
                  type="button"
                  className={`pill flex-col py-3 ${active ? "pill-active" : ""}`}
                  aria-pressed={active}
                  onClick={() => setGoals({ replacementPercent: l.pct / 100 })}
                >
                  <span>
                    {l.label} ({l.pct}%)
                  </span>
                  <span className={`text-xs font-normal ${active ? "text-white/80" : "text-gray-500"}`}>
                    {l.blurb}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <Slider
        label="Expected annual expense growth (inflation)"
        value={Math.round(goals.inflation * 1000) / 10}
        min={1}
        max={5}
        step={0.1}
        format={(v) => `${v.toFixed(1)}%`}
        onChange={(v) => setGoals({ inflation: v / 100 })}
      />

      <div className="space-y-3">
        <span className="label">Do you plan to collect Social Security?</span>
        {isCSRS ? (
          <Callout variant="info">
            CSRS employees are not eligible for the FERS Supplement or Social Security through
            federal service, so this is set automatically.
          </Callout>
        ) : null}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Social Security plan">
          {(
            [
              ["yes", "Yes"],
              ["no", "No"],
              ["csrs", "CSRS (not eligible)"],
            ] as ["yes" | "no" | "csrs", string][]
          ).map(([value, label]) => {
            const selected = isCSRS ? value === "csrs" : goals.ssPlan === value;
            return (
              <button
                key={value}
                type="button"
                disabled={isCSRS}
                className={`pill flex-1 ${selected ? "pill-active" : ""} ${
                  isCSRS ? "cursor-not-allowed opacity-60" : ""
                }`}
                aria-pressed={selected}
                onClick={() => setGoals({ ssPlan: value })}
              >
                {label}
              </button>
            );
          })}
        </div>

        {!isCSRS && goals.ssPlan === "yes" && (
          <Slider
            label="Estimated Social Security start age"
            value={ssIndex < 0 ? 0 : ssIndex}
            min={0}
            max={2}
            step={1}
            format={(i) => SS_STOPS[i]?.label ?? ""}
            minLabel="62"
            maxLabel="70"
            ticks={[{ value: 1, label: `FRA (${SS_FRA})` }]}
            onChange={(i) => setGoals({ ssStartAge: SS_STOPS[i].value })}
          />
        )}
      </div>

      <div className="flex justify-between pt-2">
        <button type="button" className="btn-secondary" onClick={onBack}>
          ← Back
        </button>
        <button type="button" className="btn-primary" onClick={onNext}>
          Next: Your accounts →
        </button>
      </div>
    </div>
  );
}
