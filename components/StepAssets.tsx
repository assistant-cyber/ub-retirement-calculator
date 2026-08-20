"use client";

import type { AssetsState, Asset, AssetType, ContributionFrequency } from "@/types";
import { newAsset } from "@/components/Wizard";

const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: "401k", label: "401(k) / TSP" },
  { value: "traditional-ira", label: "Traditional IRA" },
  { value: "roth-ira", label: "Roth IRA" },
  { value: "brokerage", label: "Brokerage account" },
  { value: "savings", label: "Savings / Cash" },
  { value: "pension-lump-sum", label: "Pension lump sum" },
  { value: "real-estate", label: "Real estate / other" },
];

interface Props {
  assetsStep: AssetsState;
  onChange: (a: AssetsState) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function StepAssets({ assetsStep, onChange, onBack, onNext }: Props) {
  const updateAsset = (id: string, patch: Partial<Asset>) =>
    onChange({
      ...assetsStep,
      assets: assetsStep.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    });

  const removeAsset = (id: string) =>
    onChange({ ...assetsStep, assets: assetsStep.assets.filter((a) => a.id !== id) });

  const addAsset = () => onChange({ ...assetsStep, assets: [...assetsStep.assets, newAsset()] });

  const setAssumption = (key: keyof AssetsState["assumptions"], pct: number) =>
    onChange({
      ...assetsStep,
      assumptions: { ...assetsStep.assumptions, [key]: pct / 100 },
    });

  return (
    <section className="card" aria-labelledby="step2-heading">
      <h2 id="step2-heading" className="mb-1 text-2xl font-bold">
        Your current situation
      </h2>
      <p className="mb-6 text-gray-600">
        Add each account you&apos;re saving in. Estimates are fine.
      </p>

      <ul className="space-y-4">
        {assetsStep.assets.map((asset, idx) => (
          <li key={asset.id} className="rounded-xl border border-gray-200 bg-ivory/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold">Asset {idx + 1}</h3>
              {assetsStep.assets.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeAsset(asset.id)}
                  className="rounded-lg px-3 py-2 min-h-[44px] text-sm font-semibold text-mulberry hover:bg-mulberry/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-mulberry"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label htmlFor={`${asset.id}-type`} className="label">
                  Type
                </label>
                <select
                  id={`${asset.id}-type`}
                  className="input"
                  value={asset.type}
                  onChange={(e) => updateAsset(asset.id, { type: e.target.value as AssetType })}
                >
                  {ASSET_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`${asset.id}-institution`} className="label">
                  Where it lives (optional)
                </label>
                <input
                  id={`${asset.id}-institution`}
                  type="text"
                  className="input"
                  placeholder='e.g. "Fidelity"'
                  value={asset.institution}
                  onChange={(e) => updateAsset(asset.id, { institution: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor={`${asset.id}-balance`} className="label">
                  Current balance ($)
                </label>
                <input
                  id={`${asset.id}-balance`}
                  type="number"
                  min={0}
                  step={1000}
                  className="input"
                  value={asset.balance || ""}
                  placeholder="0"
                  onChange={(e) => updateAsset(asset.id, { balance: Number(e.target.value) })}
                />
              </div>
              <div>
                <label htmlFor={`${asset.id}-contribution`} className="label">
                  Contribution amount ($)
                </label>
                <input
                  id={`${asset.id}-contribution`}
                  type="number"
                  min={0}
                  step={50}
                  className="input"
                  value={asset.contribution || ""}
                  placeholder="0"
                  onChange={(e) => updateAsset(asset.id, { contribution: Number(e.target.value) })}
                />
              </div>
              <div>
                <label htmlFor={`${asset.id}-frequency`} className="label">
                  Contribution frequency
                </label>
                <select
                  id={`${asset.id}-frequency`}
                  className="input"
                  value={asset.frequency}
                  onChange={(e) =>
                    updateAsset(asset.id, {
                      frequency: e.target.value as ContributionFrequency,
                    })
                  }
                >
                  <option value="monthly">Monthly</option>
                  <option value="annually">Annually</option>
                </select>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <button type="button" onClick={addAsset} className="btn-secondary mt-4">
        + Add asset
      </button>

      <div className="mt-6 max-w-sm">
        <label htmlFor="employerMatch" className="label">
          Annual employer match ($)
        </label>
        <input
          id="employerMatch"
          type="number"
          min={0}
          step={100}
          className="input"
          value={assetsStep.annualEmployerMatch || ""}
          placeholder="0"
          onChange={(e) =>
            onChange({ ...assetsStep, annualEmployerMatch: Number(e.target.value) })
          }
        />
        <p className="mt-1 text-sm text-gray-500">
          We&apos;ll treat this as a monthly contribution equivalent.
        </p>
      </div>

      <details className="mt-6 rounded-xl border border-gray-200 bg-ivory/60 p-4">
        <summary className="cursor-pointer font-semibold text-navy min-h-[44px] flex items-center">
          Advanced assumptions
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="annualReturn" className="label">
              Expected annual return before retirement (%)
            </label>
            <input
              id="annualReturn"
              type="number"
              min={0}
              max={15}
              step={0.5}
              className="input"
              value={Math.round(assetsStep.assumptions.annualReturn * 1000) / 10}
              onChange={(e) => setAssumption("annualReturn", Number(e.target.value))}
            />
          </div>
          <div>
            <label htmlFor="inflation" className="label">
              Inflation (%)
            </label>
            <input
              id="inflation"
              type="number"
              min={0}
              max={10}
              step={0.1}
              className="input"
              value={Math.round(assetsStep.assumptions.inflation * 1000) / 10}
              onChange={(e) => setAssumption("inflation", Number(e.target.value))}
            />
          </div>
          <div>
            <label htmlFor="withdrawalRate" className="label">
              Withdrawal rate (%)
            </label>
            <input
              id="withdrawalRate"
              type="number"
              min={1}
              max={10}
              step={0.25}
              className="input"
              value={Math.round(assetsStep.assumptions.withdrawalRate * 1000) / 10}
              onChange={(e) => setAssumption("withdrawalRate", Number(e.target.value))}
            />
          </div>
        </div>
      </details>

      <div className="mt-8 flex justify-between gap-4">
        <button type="button" className="btn-secondary" onClick={onBack}>
          ← Back
        </button>
        <button type="button" className="btn-primary" onClick={onNext}>
          See my results →
        </button>
      </div>
    </section>
  );
}
