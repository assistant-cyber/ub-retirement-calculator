"use client";

import { useMemo } from "react";
import { eligibilityScenarios, mraLabel } from "@/lib/fers-calculations";
import { formatDateLong, yearsMonthsLabel } from "@/lib/format";
import type { EligibilityRule } from "@/types/federal";

const RULE_LABELS: Record<EligibilityRule, string> = {
  "MRA+30": "MRA + 30 years",
  "60+20": "Age 60 + 20 years",
  "62+5": "Age 62 + 5 years",
};

const RULE_BLURBS: Record<EligibilityRule, string> = {
  "MRA+30": "Immediate, unreduced annuity at your Minimum Retirement Age with 30 years of service.",
  "60+20": "Immediate, unreduced annuity at age 60 with 20 years of service.",
  "62+5": "Immediate annuity at 62 with just 5 years — the latest safety-net rule.",
};

interface Props {
  dob: string;
  scd: string;
  militaryYears: number;
}

/** Section A: three FERS eligibility rule cards + horizontal milestone timeline. */
export default function EligibilityTimeline({ dob, scd, militaryYears }: Props) {
  const scenarios = useMemo(
    () => eligibilityScenarios(dob, scd, militaryYears),
    [dob, scd, militaryYears]
  );
  const birthYear = new Date(`${dob}T00:00:00`).getFullYear();
  const maxYears = Math.max(1, ...scenarios.map((s) => s.yearsUntil));

  return (
    <div className="space-y-6">
      <p className="text-gray-700">
        Based on your date of birth and Service Computation Date, your Minimum Retirement Age
        (MRA) is <strong>{mraLabel(birthYear)}</strong>. Here&apos;s when you first qualify under
        each FERS rule:
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        {scenarios.map((s) => (
          <div
            key={s.rule}
            className={`rounded-xl border p-4 ${
              s.earliest ? "border-green bg-green/5" : "border-gray-200 bg-white"
            }`}
          >
            {s.earliest && (
              <span className="mb-2 inline-block rounded-full bg-green px-3 py-0.5 text-xs font-bold text-white">
                Earliest eligibility
              </span>
            )}
            <h4 className="font-heading text-lg font-semibold text-navy">{RULE_LABELS[s.rule]}</h4>
            <p className="mt-1 text-2xl font-bold text-navy">
              {formatDateLong(s.eligibleDate)}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              You&apos;ll be <strong>{Math.floor(s.ageAtDate)}</strong> with about{" "}
              <strong>{Math.round(s.serviceAtDate)} years</strong> of service.
            </p>
            <p className={`mt-2 text-sm font-semibold ${s.earliest ? "text-green" : "text-navy"}`}>
              {s.yearsUntil <= 0
                ? "You're eligible now"
                : `${yearsMonthsLabel(s.yearsUntil)} to go`}
            </p>
            <p className="mt-2 text-xs text-gray-500">{RULE_BLURBS[s.rule]}</p>
          </div>
        ))}
      </div>

      {/* Horizontal timeline from today */}
      <div>
        <h4 className="mb-6 font-heading text-base font-semibold text-navy">
          Your path from today
        </h4>
        <div className="relative mx-2 mb-14 mt-8 h-1.5 rounded-full bg-gray-200">
          {/* Today marker */}
          <span className="absolute -top-7 left-0 -translate-x-1/2 text-xs font-bold text-gray-600">
            Today
          </span>
          <span className="absolute -top-1 left-0 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-white bg-gray-500 shadow" />
          {scenarios.map((s, i) => {
            const pos = Math.min(100, (s.yearsUntil / maxYears) * 100);
            return (
              <span key={s.rule}>
                <span
                  className={`absolute -top-1 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-white shadow ${
                    s.earliest ? "bg-green" : "bg-navy"
                  }`}
                  style={{ left: `${pos}%` }}
                  title={`${RULE_LABELS[s.rule]} — ${formatDateLong(s.eligibleDate)}`}
                />
                <span
                  className={`absolute w-24 -translate-x-1/2 text-center text-[11px] leading-tight ${
                    i % 2 === 0 ? "top-4" : "-top-12"
                  } ${s.earliest ? "font-bold text-green" : "text-gray-600"}`}
                  style={{ left: `${pos}%` }}
                >
                  {s.rule}
                  <br />
                  age {Math.floor(s.ageAtDate)}
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
