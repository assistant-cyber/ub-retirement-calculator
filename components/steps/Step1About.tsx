"use client";

import { ADVISORS } from "@/lib/advisors";
import { mraLabel } from "@/lib/fers-calculations";
import { ageFromISO, yearsMonthsLabel } from "@/lib/format";
import type {
  FederalStatus,
  MaritalStatus,
  UnionAffiliation,
} from "@/types/federal";
import MoneyInput from "@/components/ui/MoneyInput";
import Callout from "@/components/ui/Callout";
import type { WizardState } from "@/components/wizard-state";

interface Props {
  state: WizardState;
  setState: (updater: (prev: WizardState) => WizardState) => void;
  onNext: () => void;
  errors: Record<string, string>;
}

const UNIONS: UnionAffiliation[] = ["AFGE", "NTEU", "NFFE", "AFSCME", "None", "Other"];

export default function Step1About({ state, setState, onNext, errors }: Props) {
  const { federal } = state;
  const setFederal = (patch: Partial<WizardState["federal"]>) =>
    setState((prev) => ({ ...prev, federal: { ...prev.federal, ...patch } }));

  const age = ageFromISO(federal.dob);
  const service = ageFromISO(federal.scd); // years since SCD
  const birthYear = federal.dob ? new Date(`${federal.dob}T00:00:00`).getFullYear() : null;

  return (
    <div className="card space-y-6">
      <div>
        <h2 className="text-2xl font-bold">About you</h2>
        <p className="mt-1 text-gray-600">
          A few basics so we can calculate your eligibility and benefits accurately.
        </p>
      </div>

      {/* Advisor dropdown */}
      <div>
        <label htmlFor="advisor" className="label">
          Who is your United Benefits advisor?
        </label>
        <select
          id="advisor"
          className="input"
          value={state.advisorName}
          onChange={(e) => setState((prev) => ({ ...prev, advisorName: e.target.value }))}
        >
          {ADVISORS.map((a) => (
            <option key={a.name} value={a.name}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      {/* DOB + SCD */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label htmlFor="dob" className="label mb-0">
              Date of birth
            </label>
            {age !== null && age > 0 && (
              <span className="rounded-full bg-navy/10 px-3 py-0.5 text-sm font-semibold text-navy">
                Age {Math.floor(age)}
              </span>
            )}
          </div>
          <input
            id="dob"
            type="date"
            className={`input ${errors.dob ? "border-mulberry" : ""}`}
            value={federal.dob}
            onChange={(e) => setFederal({ dob: e.target.value })}
          />
          {errors.dob && <p className="error-text">{errors.dob}</p>}
          {birthYear && age !== null && age >= 18 && age <= 80 && (
            <p className="mt-1 text-sm text-gray-600">
              Your FERS Minimum Retirement Age (MRA) is {mraLabel(birthYear)}.
            </p>
          )}
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label htmlFor="scd" className="label mb-0">
              Service Computation Date (SCD)
            </label>
            {service !== null && service >= 0 && (
              <span className="rounded-full bg-navy/10 px-3 py-0.5 text-sm font-semibold text-navy whitespace-nowrap">
                {yearsMonthsLabel(service)} of creditable service
              </span>
            )}
          </div>
          <input
            id="scd"
            type="date"
            className={`input ${errors.scd ? "border-mulberry" : ""}`}
            value={federal.scd}
            onChange={(e) => setFederal({ scd: e.target.value })}
          />
          {errors.scd && <p className="error-text">{errors.scd}</p>}
          <p className="mt-1 text-sm text-gray-600">
            Found on your Leave &amp; Earnings Statement — it determines your creditable service.
          </p>
        </div>
      </div>

      {/* Marital status */}
      <div>
        <span className="label">Marital status</span>
        <div className="flex gap-2" role="group" aria-label="Marital status">
          {(["single", "married"] as MaritalStatus[]).map((m) => (
            <button
              key={m}
              type="button"
              className={`pill flex-1 ${federal.maritalStatus === m ? "pill-active" : ""}`}
              aria-pressed={federal.maritalStatus === m}
              onClick={() => setFederal({ maritalStatus: m })}
            >
              {m === "single" ? "Single" : "Married"}
            </button>
          ))}
        </div>
      </div>

      {/* Dependents + Union */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="dependents" className="label">
            Number of dependents
          </label>
          <select
            id="dependents"
            className="input"
            value={federal.dependents}
            onChange={(e) =>
              setFederal({ dependents: Number(e.target.value) as 0 | 1 | 2 | 3 | 4 })
            }
          >
            <option value={0}>0</option>
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4+</option>
          </select>
        </div>
        <div>
          <label htmlFor="union" className="label">
            Union affiliation
          </label>
          <select
            id="union"
            className="input"
            value={federal.union}
            onChange={(e) => setFederal({ union: e.target.value as UnionAffiliation })}
          >
            {UNIONS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Federal status */}
      <div>
        <span className="label">Are you a current federal employee?</span>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Federal employee status">
          {(
            [
              ["yes", "Yes"],
              ["no", "No"],
              ["retired-military", "Retired military"],
            ] as [FederalStatus, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`pill flex-1 ${federal.federalStatus === value ? "pill-active" : ""}`}
              aria-pressed={federal.federalStatus === value}
              onClick={() => setFederal({ federalStatus: value })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Military service */}
      <div>
        <span className="label">Do you have prior military service?</span>
        <div className="flex gap-2" role="group" aria-label="Prior military service">
          {([true, false] as const).map((v) => (
            <button
              key={String(v)}
              type="button"
              className={`pill flex-1 ${state.hasPriorMilitary === v ? "pill-active" : ""}`}
              aria-pressed={state.hasPriorMilitary === v}
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  hasPriorMilitary: v,
                  federal: { ...prev.federal, militaryYears: v ? prev.federal.militaryYears : 0 },
                }))
              }
            >
              {v ? "Yes" : "No"}
            </button>
          ))}
        </div>
        {state.hasPriorMilitary && (
          <div className="mt-3 space-y-2">
            <label htmlFor="military-years" className="label">
              How many years?
            </label>
            <input
              id="military-years"
              type="number"
              min={0}
              max={40}
              className="input max-w-[10rem]"
              value={federal.militaryYears || ""}
              onChange={(e) =>
                setFederal({ militaryYears: Math.max(0, Number(e.target.value) || 0) })
              }
            />
            <Callout variant="info">
              Military time can be credited toward FERS if a deposit is made.
            </Callout>
          </div>
        )}
      </div>

      {/* Salary */}
      <MoneyInput
        label="Current annual salary (base pay)"
        value={federal.salary}
        onChange={(v) => setFederal({ salary: v })}
        placeholder="85,000"
        lesBadge={state.lesAutofill.salary}
        error={errors.salary}
      />

      <div className="flex justify-end pt-2">
        <button type="button" className="btn-primary" onClick={onNext}>
          Next: Federal benefits →
        </button>
      </div>
    </div>
  );
}
