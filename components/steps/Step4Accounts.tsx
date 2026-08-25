"use client";

import MoneyInput from "@/components/ui/MoneyInput";
import type { WizardState } from "@/components/wizard-state";

interface Props {
  state: WizardState;
  setState: (updater: (prev: WizardState) => WizardState) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step4Accounts({ state, setState, onNext, onBack }: Props) {
  const { outside, federal } = state;
  const setOutside = (patch: Partial<WizardState["outside"]>) =>
    setState((prev) => ({ ...prev, outside: { ...prev.outside, ...patch } }));

  return (
    <div className="card space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Your other accounts</h2>
        <p className="mt-1 text-gray-600">
          Anything outside your federal benefits that will support you in retirement.
        </p>
      </div>

      <MoneyInput
        label="Additional savings / investments outside TSP (optional)"
        value={outside.additionalSavings}
        onChange={(v) => setOutside({ additionalSavings: v })}
        placeholder="25,000"
        note="Brokerage accounts, IRAs, CDs, or other savings you've already built."
      />

      <MoneyInput
        label="Monthly savings rate outside federal benefits"
        value={outside.monthlySavingsOutside}
        onChange={(v) => setOutside({ monthlySavingsOutside: v })}
        placeholder="250"
        note="What you add to those outside accounts each month."
      />

      {federal.maritalStatus === "married" && (
        <MoneyInput
          label="Spouse income in retirement (monthly)"
          value={outside.spouseMonthlyIncome}
          onChange={(v) => setOutside({ spouseMonthlyIncome: v })}
          placeholder="1,500"
          note="Your spouse's expected pension, Social Security, or other retirement income."
        />
      )}

      <div>
        <span className="label">Any pension from prior employment?</span>
        <div className="flex gap-2" role="group" aria-label="Prior employer pension">
          {([true, false] as const).map((v) => (
            <button
              key={String(v)}
              type="button"
              className={`pill flex-1 ${state.hasPriorPension === v ? "pill-active" : ""}`}
              aria-pressed={state.hasPriorPension === v}
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  hasPriorPension: v,
                  outside: {
                    ...prev.outside,
                    priorPensionMonthly: v ? prev.outside.priorPensionMonthly : 0,
                  },
                }))
              }
            >
              {v ? "Yes" : "No"}
            </button>
          ))}
        </div>
        {state.hasPriorPension && (
          <div className="mt-3">
            <MoneyInput
              label="Estimated monthly amount"
              value={outside.priorPensionMonthly}
              onChange={(v) => setOutside({ priorPensionMonthly: v })}
              placeholder="800"
            />
          </div>
        )}
      </div>

      <div>
        <span className="label">
          Are you currently contributing to a Roth IRA or other retirement account outside TSP?
        </span>
        <div className="flex gap-2" role="group" aria-label="Roth IRA outside TSP">
          {([true, false] as const).map((v) => (
            <button
              key={String(v)}
              type="button"
              className={`pill flex-1 ${outside.hasRothIRA === v ? "pill-active" : ""}`}
              aria-pressed={outside.hasRothIRA === v}
              onClick={() => setOutside({ hasRothIRA: v })}
            >
              {v ? "Yes" : "No"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button type="button" className="btn-secondary" onClick={onBack}>
          ← Back
        </button>
        <button type="button" className="btn-primary" onClick={onNext}>
          See my report →
        </button>
      </div>
    </div>
  );
}
