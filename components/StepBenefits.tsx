"use client";

import type { BenefitKey, BenefitsState, BenefitStatus, TspMatchAnswer } from "@/types";
import { BENEFIT_LABELS, BENEFIT_ORDER } from "@/lib/profile";

const BENEFIT_DESCRIPTIONS: Record<BenefitKey, string> = {
  tsp: "Your workplace retirement savings plan — the federal 401(k).",
  pension: "Your guaranteed federal annuity based on years of service.",
  fehb: "Federal Employees Health Benefits — can often continue into retirement.",
  fegli: "Federal Employees' Group Life Insurance.",
  disability: "Short/long-term income protection if illness or injury stops your paycheck.",
  "long-term-care": "Coverage for extended care needs that health insurance doesn't pay for.",
  fedvip: "Supplemental dental and vision coverage.",
  "hsa-fsa": "Tax-advantaged accounts for healthcare and dependent-care expenses.",
};

const STATUS_OPTIONS: { value: BenefitStatus; label: string }[] = [
  { value: "using", label: "Using it" },
  { value: "not-using", label: "Not using it" },
  { value: "unsure", label: "Not sure" },
];

const TSP_MATCH_OPTIONS: { value: TspMatchAnswer; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unsure", label: "Not sure" },
];

const statusClasses = (selected: boolean, value: BenefitStatus) => {
  if (!selected) {
    return "bg-white text-navy border border-gray-300 hover:border-navy";
  }
  switch (value) {
    case "using":
      return "bg-green text-white border border-green";
    case "not-using":
      return "bg-mulberry text-white border border-mulberry";
    case "unsure":
      return "bg-gold text-white border border-gold";
  }
};

interface Props {
  benefits: BenefitsState;
  onChange: (b: BenefitsState) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function StepBenefits({ benefits, onChange, onBack, onNext }: Props) {
  const setStatus = (key: BenefitKey, status: BenefitStatus) =>
    onChange({
      ...benefits,
      [key]: {
        ...benefits[key],
        status,
        // Clear the TSP sub-answer if TSP is no longer "using"
        ...(key === "tsp" && status !== "using" ? { tspFullMatch: undefined } : {}),
      },
    });

  const setTspMatch = (answer: TspMatchAnswer) =>
    onChange({ ...benefits, tsp: { ...benefits.tsp, tspFullMatch: answer } });

  return (
    <section className="card" aria-labelledby="step2-heading">
      <h2 id="step2-heading" className="mb-1 text-2xl font-bold">
        Your federal benefits
      </h2>
      <p className="mb-6 text-gray-600">
        Federal employees have access to powerful benefits — but many go unused. Tell us where you
        stand with each one. &quot;Not sure&quot; is a perfectly good answer.
      </p>

      <ul className="space-y-4">
        {BENEFIT_ORDER.map((key) => {
          const sel = benefits[key];
          return (
            <li key={key} className="rounded-xl border border-gray-200 bg-ivory/60 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-heading text-lg font-bold text-navy">
                    {BENEFIT_LABELS[key]}
                  </h3>
                  <p className="text-sm text-gray-600">{BENEFIT_DESCRIPTIONS[key]}</p>
                </div>
                <div
                  className="flex shrink-0 gap-2"
                  role="group"
                  aria-label={`${BENEFIT_LABELS[key]} status`}
                >
                  {STATUS_OPTIONS.map((opt) => {
                    const selected = sel.status === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setStatus(key, opt.value)}
                        aria-pressed={selected}
                        className={`rounded-lg px-3 py-2 min-h-[44px] text-sm font-semibold transition-colors
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 ${statusClasses(
                            selected,
                            opt.value
                          )}`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {key === "tsp" && sel.status === "using" && (
                <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
                  <p className="label mb-2">
                    Are you contributing at least 5% (to get the full government match)?
                  </p>
                  <div className="flex gap-2" role="group" aria-label="TSP full match">
                    {TSP_MATCH_OPTIONS.map((opt) => {
                      const selected = sel.tspFullMatch === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setTspMatch(opt.value)}
                          aria-pressed={selected}
                          className={`rounded-lg px-4 py-2 min-h-[44px] text-sm font-semibold transition-colors
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 ${
                              selected
                                ? "bg-navy text-white border border-navy"
                                : "bg-white text-navy border border-gray-300 hover:border-navy"
                            }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-8 flex justify-between gap-4">
        <button type="button" className="btn-secondary" onClick={onBack}>
          ← Back
        </button>
        <button type="button" className="btn-primary" onClick={onNext}>
          Next: Your goals →
        </button>
      </div>
    </section>
  );
}
