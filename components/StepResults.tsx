"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
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
import { computeResults, projectionByYear, projectAsset, monthlyEquivalent } from "@/lib/calc";
import { toVisionState } from "@/lib/profile";
import type {
  AboutState,
  AdvisorInsights,
  AssetsState,
  BenefitsState,
  GoalsState,
} from "@/types";

// react-pdf must never render during SSR — load the download button client-only.
const DownloadReportButton = dynamic(() => import("@/components/DownloadReportButton"), {
  ssr: false,
});

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
  about: AboutState;
  benefits: BenefitsState;
  goals: GoalsState;
  assetsStep: AssetsState;
  onBack: () => void;
  onStartOver: () => void;
}

type InsightsStatus = "loading" | "ready" | "error";

export default function StepResults({
  about,
  benefits,
  goals,
  assetsStep,
  onBack,
  onStartOver,
}: Props) {
  const vision = useMemo(() => toVisionState(about, goals), [about, goals]);
  const results = useMemo(() => computeResults(vision, assetsStep), [vision, assetsStep]);
  const chartData = useMemo(
    () => projectionByYear(assetsStep, vision.currentAge, vision.retirementAge),
    [assetsStep, vision.currentAge, vision.retirementAge]
  );

  const [insights, setInsights] = useState<AdvisorInsights | null>(null);
  const [insightsStatus, setInsightsStatus] = useState<InsightsStatus>("loading");
  const requestedRef = useRef(false);

  const fetchInsights = useCallback(async () => {
    setInsightsStatus("loading");
    try {
      const assetsSummary = {
        totalCurrentBalance: assetsStep.assets.reduce((s, a) => s + a.balance, 0),
        totalMonthlyContribution: assetsStep.assets.reduce(
          (s, a) => s + monthlyEquivalent(a.contribution, a.frequency),
          0
        ),
        annualEmployerMatch: assetsStep.annualEmployerMatch,
        accountTypes: Array.from(new Set(assetsStep.assets.map((a) => ASSET_LABELS[a.type]))),
      };
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          about,
          benefits,
          goals,
          assetsSummary,
          results: {
            years: results.years,
            projected: results.projected,
            needed: results.needed,
            percent: results.percent,
            band: results.band,
            gap: results.gap,
            extraMonthlyToClose: results.extraMonthlyToClose,
            sustainableMonthlyIncome: results.sustainableMonthlyIncome,
            netNeedAtRetirementMonthly: results.netNeedAtRetirementMonthly,
          },
        }),
      });
      if (!res.ok) throw new Error(`Insights request failed (${res.status})`);
      const data = (await res.json()) as AdvisorInsights;
      setInsights(data);
      setInsightsStatus("ready");
    } catch (e) {
      console.error(e);
      setInsightsStatus("error");
    }
  }, [about, benefits, goals, assetsStep, results]);

  useEffect(() => {
    if (requestedRef.current) return;
    requestedRef.current = true;
    void fetchInsights();
  }, [fetchInsights]);

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

      {/* Advisor insights */}
      <section className="card" aria-labelledby="insights-heading">
        <h2 id="insights-heading" className="mb-1 text-xl font-bold">
          Your Personalized Advisor Insights
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          Generated from your answers by the United Benefits advisor assistant.
        </p>

        {insightsStatus === "loading" && (
          <div aria-busy="true" className="space-y-3">
            <p className="font-semibold text-navy">Your advisor insights are being prepared…</p>
            <div className="h-4 w-3/4 animate-pulse rounded bg-navy/10" />
            <div className="h-4 w-full animate-pulse rounded bg-navy/10" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-navy/10" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-navy/10" />
          </div>
        )}

        {insightsStatus === "error" && (
          <div className="rounded-lg bg-mulberry/5 p-4">
            <p className="font-semibold text-mulberry">
              We couldn&apos;t prepare your personalized insights just now. Your numbers above are
              still accurate.
            </p>
            <button type="button" className="btn-secondary mt-3" onClick={() => void fetchInsights()}>
              Try again
            </button>
          </div>
        )}

        {insightsStatus === "ready" && insights && (
          <div className="space-y-6">
            <p className="text-gray-700">{insights.summary}</p>

            {insights.benefitGaps.length > 0 && (
              <div>
                <h3 className="mb-2 font-heading text-lg font-bold text-navy">
                  Benefit gaps to review
                </h3>
                <ul className="space-y-3">
                  {insights.benefitGaps.map((g, i) => (
                    <li key={i} className="rounded-lg border border-gray-200 bg-ivory/60 p-4">
                      <p className="font-semibold text-mulberry">{g.title}</p>
                      <p className="mt-1 text-sm text-gray-700">{g.detail}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h3 className="mb-2 font-heading text-lg font-bold text-navy">
                Your goals &amp; your numbers
              </h3>
              <p className="text-gray-700">{insights.goalAlignment}</p>
            </div>

            <div>
              <h3 className="mb-2 font-heading text-lg font-bold text-navy">
                Recommended next steps
              </h3>
              <ol className="space-y-3">
                {insights.actionSteps.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-navy">{s.step}</p>
                      <p className="text-sm text-gray-700">{s.why}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <p className="italic text-gray-700">{insights.encouragement}</p>

            {insights.mock && (
              <p className="text-xs text-gray-400">
                Preview insights generated locally (no advisor AI key configured).
              </p>
            )}
          </div>
        )}
      </section>

      {/* PDF download */}
      <section className="card text-center" aria-label="Download report">
        <DownloadReportButton
          about={about}
          benefits={benefits}
          results={results}
          insights={insights}
          disabled={insightsStatus === "loading"}
        />
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
