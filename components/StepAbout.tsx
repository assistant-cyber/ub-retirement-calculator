"use client";

import { useState } from "react";
import type { AboutState, FederalStatus, MaritalStatus } from "@/types";

interface Props {
  about: AboutState;
  onChange: (a: AboutState) => void;
  onNext: () => void;
}

const MARITAL_OPTIONS: { value: MaritalStatus; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
];

const FEDERAL_OPTIONS: { value: FederalStatus; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "retired-military", label: "Retired military" },
];

export default function StepAbout({ about, onChange, onNext }: Props) {
  const [errors, setErrors] = useState<{ [k: string]: string }>({});

  const set = <K extends keyof AboutState>(key: K, value: AboutState[K]) =>
    onChange({ ...about, [key]: value });

  const validate = () => {
    const e: { [k: string]: string } = {};
    if (!Number.isFinite(about.currentAge) || about.currentAge < 18 || about.currentAge > 70) {
      e.currentAge = "Please enter an age between 18 and 70.";
    }
    if (!Number.isFinite(about.retirementAge) || about.retirementAge <= about.currentAge) {
      e.retirementAge = "Retirement age must be greater than your current age.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  const isFederal = about.federalStatus === "yes";

  return (
    <section className="card" aria-labelledby="step1-heading">
      <h2 id="step1-heading" className="mb-1 text-2xl font-bold">
        Tell us a little about you
      </h2>
      <p className="mb-6 text-gray-600">
        A few basics so we can tailor your retirement picture.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="currentAge" className="label">
            Current age
          </label>
          <input
            id="currentAge"
            type="number"
            min={18}
            max={70}
            className="input"
            value={about.currentAge || ""}
            onChange={(e) => set("currentAge", Number(e.target.value))}
            aria-invalid={!!errors.currentAge}
            aria-describedby={errors.currentAge ? "currentAge-error" : undefined}
          />
          {errors.currentAge && (
            <p id="currentAge-error" className="error-text">
              {errors.currentAge}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="retirementAge" className="label">
            Target retirement age
          </label>
          <input
            id="retirementAge"
            type="number"
            min={about.currentAge + 1}
            max={100}
            className="input"
            value={about.retirementAge || ""}
            onChange={(e) => set("retirementAge", Number(e.target.value))}
            aria-invalid={!!errors.retirementAge}
            aria-describedby={errors.retirementAge ? "retirementAge-error" : undefined}
          />
          {errors.retirementAge && (
            <p id="retirementAge-error" className="error-text">
              {errors.retirementAge}
            </p>
          )}
        </div>
      </div>

      <fieldset className="mt-8">
        <legend className="label mb-3">Marital status</legend>
        <div className="grid gap-4 sm:grid-cols-2" role="group">
          {MARITAL_OPTIONS.map((opt) => {
            const selected = about.maritalStatus === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => set("maritalStatus", opt.value)}
                aria-pressed={selected}
                className={`rounded-xl border-2 p-4 text-center transition-colors min-h-[44px]
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 ${
                    selected
                      ? "border-mulberry bg-mulberry/5"
                      : "border-gray-200 bg-white hover:border-navy/40"
                  }`}
              >
                <span className="block font-heading text-lg font-bold text-navy">
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="label mb-3">Are you a current federal employee?</legend>
        <div className="flex flex-wrap gap-3" role="group">
          {FEDERAL_OPTIONS.map((opt) => {
            const selected = about.federalStatus === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => set("federalStatus", opt.value)}
                aria-pressed={selected}
                className={`btn ${
                  selected
                    ? "bg-navy text-white focus-visible:ring-navy"
                    : "bg-white text-navy border border-gray-300 hover:border-navy focus-visible:ring-navy"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {isFederal && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="agency" className="label">
                Agency (optional)
              </label>
              <input
                id="agency"
                type="text"
                className="input"
                placeholder='e.g. "USPS", "VA", "DoD"'
                value={about.agency}
                onChange={(e) => set("agency", e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="yearsOfService" className="label">
                Years of federal service (optional)
              </label>
              <input
                id="yearsOfService"
                type="number"
                min={0}
                max={60}
                className="input"
                placeholder="0"
                value={about.yearsOfService ?? ""}
                onChange={(e) =>
                  set("yearsOfService", e.target.value === "" ? null : Number(e.target.value))
                }
              />
            </div>
          </div>
        )}
      </fieldset>

      <div className="mt-8 flex justify-end">
        <button type="button" className="btn-primary" onClick={handleNext}>
          Next: Your benefits →
        </button>
      </div>
    </section>
  );
}
