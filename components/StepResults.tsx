"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { computeResults, projectionByYear, projectAsset } from "@/lib/calc";
import type { VisionState, AssetsState } from "@/types";

const ASSET_LABELS: Record<string, string> = {
  "401k": "401(k) / TSP",
  "traditional-ira": "Traditional IRA",
  "roth-ira": "Roth IRA",
  brokerage: "Brokerage account",
  savings: "Savings / Cash",
  "pension-lump-sum": "Pension lump sum",
  "real-estate": "Real estate / other",
};

const usd = (n: number, fractionDigits = 0) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: fractionDigits,
  });

const compactUsd = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `$${Math.round(n / 1_000)}k` : `$${n}`;

const BAND_META = {
  "on-track": {
    label: "On track",
    color: "#2e7d4f",
    message:
      "Great work — you're projected to meet or exceed your retirement goal. Keep it up!",
  },
  "getting-close": {
    label: "Getting close",
    color: "#c9a227",
    message:
      "You're getting close. A modest boost to your savings could put you fully on track.",
  },
  "needs-attention": {
    label: "Needs attention",
    color: "#9c221f",
    message:
      "There's a meaningful gap between your projected savings and your goal — but you have options.",
  },
} as const;

interface Props {
  vision: VisionState;
  assetsStep: AssetsState;
  onBack: () => void;
  onStartOver: () => void;
}

export default function StepResults({ vision, assetsStep, onBack, onStartOver }: Props) {
  const results = useMemo(() => computeResults(vision, assetsStep), [vision, assetsStep]);
  const chartData = useMemo(
    () => projectionByYear(assetsStep, vision.currentAge, vision.retirementAge),
    [assetsStep, vision.currentAge, vision.retirementAge]
  );

  const band = BAND_META[results.band];

  return (
    <div aria-live="polite" className="space-y-6">
      {/* Headline */}
      <section className="card text-center" aria-labelledby="results-heading">
        <h2 id="results-heading" className="text-2xl font-bold">
          Your retirement outlook
        </h2>
        <p className="mt-4 text-gray-600">
          Projected savings at age {vision.retirementAge}:
        </p>
        <p className="font-heading text-4xl font-bold text-mulberry sm:text-5xl">
          {usd(results.projected)}
        </p>
        <p className="mt-3 text-gray-600">
          Estimated amount you&apos;ll need:{" "}
          <strong className="text-navy">{usd(results.needed)}</strong>
        </p>

        {/* On-track meter */}
        <div className="mx-auto mt-6 max-w-xl">
          <div className="mb-1 flex items-center justify-between text-sm font-semibold">
            <span style={{ color: band.color }}>{band.label}</span>
            <span className="text-gray-600">{Math.round(results.percent)}% of goal</span>
          </div>
          <div
            role="meter"
            aria-valuemin={0}
            aria-valuemax={150}
            aria-valuenow={Math.round(results.barPercent)}
            aria-label="Retirement readiness percentage"
            className="h-4 w-full overflow-hidden rounded-full bg-gray-200"
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(results.barPercent / 150) * 100}%`,
                backgroundColor: band.color,
              }}
            />
          </div>
          <p className="mt-3 text-gray-700">{band.message}</p>
        </div>
      </section>

      {/* Income comparison */}
      <section className="card" aria-labelledby="income-heading">
        <h2 id="income-heading" className="mb-4 text-xl font-bold">
          Monthly income in retirement
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-ivory/60 p-5 text-center">
            <p className="text-sm font-semibold text-gray-600">
              Sustainable monthly income from savings
            </p>
            <p className="mt-1 font-heading text-3xl font-bold text-navy">
              {usd(results.sustainableMonthlyIncome)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              At a {(assetsStep.assumptions.withdrawalRate * 100).toFixed(1)}% withdrawal rate
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-ivory/60 p-5 text-center">
            <p className="text-sm font-semibold text-gray-600">
              Your estimated monthly need at retirement
            </p>
            <p className="mt-1 font-heading text-3xl font-bold text-navy">
              {usd(results.netNeedAtRetirementMonthly)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {usd(results.netNeedTodayMonthly)}/mo today, adjusted for inflation
            </p>
          </div>
        </div>

        {results.gap > 0 && Number.isFinite(results.extraMonthlyToClose) && (
          <p className="mt-4 rounded-lg bg-mulberry/5 p-4 font-semibold text-mulberry">
            Contributing about {usd(results.extraMonthlyToClose)} more per month could close the
            gap by age {vision.retirementAge}.
          </p>
        )}
      </section>

      {/* Chart */}
      <section className="card" aria-labelledby="chart-heading">
        <h2 id="chart-heading" className="mb-4 text-xl font-bold">
          Projected savings by age
        </h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 16, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="age" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis tickFormatter={compactUsd} tick={{ fontSize: 12 }} tickLine={false} width={64} />
              <Tooltip
                formatter={(value) => [usd(Number(value)), "Projected balance"]}
                labelFormatter={(age) => `Age ${age}`}
              />
              <ReferenceLine
                y={results.needed}
                stroke="#9c221f"
                strokeWidth={2}
                strokeDasharray="6 4"
                label={{ value: "Needed", fill: "#9c221f", fontSize: 12, position: "insideTopRight" }}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#21205f"
                strokeWidth={2}
                fill="#21205f"
                fillOpacity={0.15}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 text-sm text-gray-600">
          Chart summary: your savings are projected to grow from {usd(chartData[0]?.balance ?? 0)}{" "}
          today to {usd(results.projected)} by age {vision.retirementAge}, compared with an
          estimated need of {usd(results.needed)}.
        </p>
      </section>

      {/* Breakdown table */}
      <section className="card" aria-labelledby="breakdown-heading">
        <h2 id="breakdown-heading" className="mb-4 text-xl font-bold">
          Asset breakdown at retirement
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-navy">
                <th scope="col" className="py-2 pr-4 font-semibold">Asset</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Where it lives</th>
                <th scope="col" className="py-2 pr-4 font-semibold text-right">Current balance</th>
                <th scope="col" className="py-2 font-semibold text-right">Projected at {vision.retirementAge}</th>
              </tr>
            </thead>
            <tbody>
              {assetsStep.assets.map((a) => (
                <tr key={a.id} className="border-b border-gray-100">
                  <td className="py-2.5 pr-4">{ASSET_LABELS[a.type]}</td>
                  <td className="py-2.5 pr-4 text-gray-600">{a.institution || "—"}</td>
                  <td className="py-2.5 pr-4 text-right">{usd(a.balance)}</td>
                  <td className="py-2.5 text-right font-semibold text-navy">
                    {usd(projectAsset(a, assetsStep.assumptions.annualReturn, results.years))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Actions */}
      <section className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div className="flex gap-3">
          <button type="button" className="btn-secondary" onClick={onBack}>
            ← Adjust my numbers
          </button>
          <button type="button" className="btn-secondary" onClick={onStartOver}>
            Start over
          </button>
        </div>
        <a
          href="https://unitedbenefits.com/contact/"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
        >
          Schedule a Free Benefits Review
        </a>
      </section>

      <p className="text-xs text-gray-500">
        This is an educational estimate only, not financial advice. Projections assume constant
        annual returns and inflation, which real markets will not deliver. Please consult a United
        Benefits advisor about your specific situation.
      </p>
    </div>
  );
}
