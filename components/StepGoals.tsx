"use client";

import { useState } from "react";
import type { GoalsState, Lifestyle, PriorityKey } from "@/types";
import { PRIORITY_LABELS } from "@/lib/profile";

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

const PRIORITY_KEYS = Object.keys(PRIORITY_LABELS) as PriorityKey[];
const MAX_PRIORITIES = 3;

interface Props {
  goals: GoalsState;
  onChange: (g: GoalsState) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function StepGoals({ goals, onChange, onBack, onNext }: Props) {
  const [errors, setErrors] = useState<{ [k: string]: string }>({});

  const set = <K extends keyof GoalsState>(key: K, value: GoalsState[K]) =>
    onChange({ ...goals, [key]: value });

  const pickLifestyle = (l: (typeof LIFESTYLES)[number]) =>
    onChange({ ...goals, lifestyle: l.key, monthlySpend: l.monthly });

  const togglePriority = (key: PriorityKey) => {
    const has = goals.priorities.includes(key);
    if (has) {
      set(
        "priorities",
        goals.priorities.filter((p) => p !== key)
      );
    } else if (goals.priorities.length < MAX_PRIORITIES) {
      set("priorities", [...goals.priorities, key]);
    }
  };

  const validate = () => {
    const e: { [k: string]: string } = {};
    if (!Number.isFinite(goals.monthlySpend) || goals.monthlySpend <= 0) {
      e.monthlySpend = "Please enter a monthly spending amount greater than $0.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  return (
    <section className="card" aria-labelledby="step3-heading">
      <h2 id="step3-heading" className="mb-1 text-2xl font-bold">
        Your retirement goals
      </h2>
      <p className="mb-6 text-gray-600">
        Tell us about the lifestyle you want — in numbers and in your own words.
      </p>

      <fieldset>
        <legend className="label mb-3">What kind of retirement lifestyle do you picture?</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          {LIFESTYLES.map((l) => {
            const selected = goals.lifestyle === l.key;
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
            value={goals.monthlySpend || ""}
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
            value={goals.monthlySocialSecurity || ""}
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
              aria-pressed={goals.homePaidOff === opt.value}
              className={`btn ${
                goals.homePaidOff === opt.value
                  ? "bg-navy text-white focus-visible:ring-navy"
                  : "bg-white text-navy border border-gray-300 hover:border-navy focus-visible:ring-navy"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {!goals.homePaidOff && (
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
              value={goals.monthlyHousing || ""}
              placeholder="0"
              onChange={(e) => set("monthlyHousing", Number(e.target.value))}
            />
          </div>
        )}
      </fieldset>

      <div className="mt-8">
        <label htmlFor="idealRetirement" className="label">
          In your own words, what does your ideal retirement look like?{" "}
          <span className="font-normal text-gray-500">(optional)</span>
        </label>
        <textarea
          id="idealRetirement"
          className="input min-h-[96px]"
          maxLength={500}
          placeholder="e.g. traveling with my spouse, time with the grandkids, part-time consulting, more fishing…"
          value={goals.idealRetirement}
          onChange={(e) => set("idealRetirement", e.target.value)}
        />
      </div>

      <div className="mt-6">
        <label htmlFor="biggestWorry" className="label">
          What&apos;s your biggest financial worry about retirement?{" "}
          <span className="font-normal text-gray-500">(optional)</span>
        </label>
        <textarea
          id="biggestWorry"
          className="input min-h-[96px]"
          maxLength={500}
          placeholder="e.g. healthcare costs, outliving my savings, market downturns…"
          value={goals.biggestWorry}
          onChange={(e) => set("biggestWorry", e.target.value)}
        />
      </div>

      <fieldset className="mt-8">
        <legend className="label mb-1">What matters most to you?</legend>
        <p className="mb-3 text-sm text-gray-500">
          Pick up to {MAX_PRIORITIES}. Selected: {goals.priorities.length}/{MAX_PRIORITIES}
        </p>
        <div className="flex flex-wrap gap-2" role="group">
          {PRIORITY_KEYS.map((key) => {
            const selected = goals.priorities.includes(key);
            const disabled = !selected && goals.priorities.length >= MAX_PRIORITIES;
            return (
              <button
                key={key}
                type="button"
                onClick={() => togglePriority(key)}
                aria-pressed={selected}
                disabled={disabled}
                className={`rounded-full px-4 py-2 min-h-[44px] text-sm font-semibold transition-colors
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 ${
                    selected
                      ? "bg-navy text-white border border-navy"
                      : disabled
                        ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                        : "bg-white text-navy border border-gray-300 hover:border-navy"
                  }`}
              >
                {PRIORITY_LABELS[key]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-8 flex justify-between gap-4">
        <button type="button" className="btn-secondary" onClick={onBack}>
          ← Back
        </button>
        <button type="button" className="btn-primary" onClick={handleNext}>
          Next: Your accounts →
        </button>
      </div>
    </section>
  );
}
