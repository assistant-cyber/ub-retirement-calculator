"use client";

import { useState } from "react";
import type { VisionState, Lifestyle } from "@/types";

const LIFESTYLES: {
  key: Lifestyle;
  title: string;
  desc: string;
  monthly: number;
}[] = [
  {
    key: "modest",
    title: "Modest",
    desc: "Cover the essentials and stay close to home.",
    monthly: 4000,
  },
  {
    key: "comfortable",
    title: "Comfortable",
    desc: "Travel sometimes, enjoy hobbies and dining out.",
    monthly: 6500,
  },
  {
    key: "luxury",
    title: "Luxury",
    desc: "Frequent travel, a second home, generous giving.",
    monthly: 10000,
  },
];

interface Props {
  vision: VisionState;
  onChange: (v: VisionState) => void;
  onNext: () => void;
}

export default function StepVision({ vision, onChange, onNext }: Props) {
  const [errors, setErrors] = useState<{ [k: string]: string }>({});

  const set = <K extends keyof VisionState>(key: K, value: VisionState[K]) =>
    onChange({ ...vision, [key]: value });

  const pickLifestyle = (l: (typeof LIFESTYLES)[number]) =>
    onChange({ ...vision, lifestyle: l.key, monthlySpend: l.monthly });

  const validate = () => {
    const e: { [k: string]: string } = {};
    if (!Number.isFinite(vision.currentAge) || vision.currentAge < 18 || vision.currentAge > 70) {
      e.currentAge = "Please enter an age between 18 and 70.";
    }
    if (!Number.isFinite(vision.retirementAge) || vision.retirementAge <= vision.currentAge) {
      e.retirementAge = "Retirement age must be greater than your current age.";
    }
    if (!Number.isFinite(vision.monthlySpend) || vision.monthlySpend <= 0) {
      e.monthlySpend = "Please enter a monthly spending amount greater than $0.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  return (
    <section className="card" aria-labelledby="step1-heading">
      <h2 id="step1-heading" className="mb-1 text-2xl font-bold">
        What does retirement look like for you?
      </h2>
      <p className="mb-6 text-gray-600">Tell us about your timeline and the lifestyle you want.</p>

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
            value={vision.currentAge || ""}
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
            min={vision.currentAge + 1}
            max={100}
            className="input"
            value={vision.retirementAge || ""}
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
        <legend className="label mb-3">What kind of retirement lifestyle do you picture?</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          {LIFESTYLES.map((l) => {
            const selected = vision.lifestyle === l.key;
            return (
              <button
                key={l.key}
                type="button"
                onClick={() => pickLifestyle(l)}
                aria-pressed={selected}
                className={`rounded-xl border-2 p-4 text-left transition-colors min-h-[44px]
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 ${
                    selected
                      ? "border-mulberry bg-mulberry/5"
                      : "border-gray-200 bg-white hover:border-navy/40"
                  }`}
              >
                <span className="block font-heading text-lg font-bold text-navy">{l.title}</span>
                <span className="mt-1 block text-sm text-gray-600">{l.desc}</span>
                <span className="mt-2 block text-sm font-semibold text-mulberry">
                  ~${l.monthly.toLocaleString()}/mo
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="monthlySpend" className="label">
            Desired monthly spending in retirement (today&apos;s dollars)
          </label>
          <input
            id="monthlySpend"
            type="number"
            min={0}
            step={100}
            className="input"
            value={vision.monthlySpend || ""}
            onChange={(e) => set("monthlySpend", Number(e.target.value))}
            aria-invalid={!!errors.monthlySpend}
            aria-describedby={errors.monthlySpend ? "monthlySpend-error" : undefined}
          />
          {errors.monthlySpend && (
            <p id="monthlySpend-error" className="error-text">
              {errors.monthlySpend}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="socialSecurity" className="label">
            Expected monthly Social Security / pension income (optional)
          </label>
          <input
            id="socialSecurity"
            type="number"
            min={0}
            step={100}
            className="input"
            value={vision.monthlySocialSecurity || ""}
            placeholder="0"
            onChange={(e) => set("monthlySocialSecurity", Number(e.target.value))}
          />
        </div>
      </div>

      <fieldset className="mt-6">
        <legend className="label mb-2">Will your home be paid off by retirement?</legend>
        <div className="flex gap-3" role="group">
          {[
            { label: "Yes", value: true },
            { label: "No", value: false },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => set("homePaidOff", opt.value)}
              aria-pressed={vision.homePaidOff === opt.value}
              className={`btn ${
                vision.homePaidOff === opt.value
                  ? "bg-navy text-white focus-visible:ring-navy"
                  : "bg-white text-navy border border-gray-300 hover:border-navy focus-visible:ring-navy"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {!vision.homePaidOff && (
          <div className="mt-4 max-w-sm">
            <label htmlFor="monthlyHousing" className="label">
              Expected monthly mortgage/rent in retirement
            </label>
            <input
              id="monthlyHousing"
              type="number"
              min={0}
              step={100}
              className="input"
              value={vision.monthlyHousing || ""}
              placeholder="0"
              onChange={(e) => set("monthlyHousing", Number(e.target.value))}
            />
          </div>
        )}
      </fieldset>

      <div className="mt-8 flex justify-end">
        <button type="button" className="btn-primary" onClick={handleNext}>
          Next: Your savings →
        </button>
      </div>
    </section>
  );
}
