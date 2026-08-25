"use client";

import { useMemo, useState } from "react";
import type {
  EligibilityScenario,
  GapNarrativeResponse,
  IncomeBreakdown,
  Age57Snapshot as Age57SnapshotResult,
  SSEstimateResponse,
} from "@/types/federal";
import type { ReportPDFProps } from "@/components/ReportPDF";
import { ADVISORS } from "@/lib/advisors";
import { usd } from "@/lib/format";

interface Props {
  pdfProps: ReportPDFProps;
  advisorName: string;
  breakdown: IncomeBreakdown;
  scenarios: EligibilityScenario[];
  snapshot: Age57SnapshotResult;
  ssEstimate: SSEstimateResponse | null;
  narrative: GapNarrativeResponse | null;
}

/** Section F: download PDF, email advisor, save (coming soon), schedule a call. */
export default function ReportActions({
  pdfProps,
  advisorName,
  breakdown,
  scenarios,
}: Props) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const advisor = ADVISORS.find((a) => a.name === advisorName);
  const advisorEmail = advisor?.email || "info@unitedbenefits.com";

  const mailtoHref = useMemo(() => {
    const earliest = scenarios.find((s) => s.earliest);
    const subject = `UB Retirement Report — ${
      advisorName && advisorName !== "Not sure / Assign me one" ? advisorName : "New client"
    }`;
    const lines = [
      "Hi,",
      "",
      "Here is a summary of my United Benefits retirement report:",
      "",
      `Target retirement age: ${pdfProps.retirementAge}`,
      earliest ? `Earliest eligibility: ${earliest.eligibleDate} (${earliest.rule})` : "",
      `Projected income: ${usd(breakdown.totalMonthly)}/mo`,
      `Target income: ${usd(breakdown.targetMonthly)}/mo (${Math.round(
        pdfProps.replacementPercent * 100
      )}% replacement)`,
      breakdown.gapMonthly > 0
        ? `Gap: ${usd(breakdown.gapMonthly)}/mo`
        : `Surplus: ${usd(-breakdown.gapMonthly)}/mo`,
      `Projected TSP at retirement: ${usd(breakdown.tspBalanceAtRetirement)}`,
      "",
      "I'd like to review this with an advisor.",
      "Thanks!",
    ].filter(Boolean);
    const body = lines.join("\n").slice(0, 1400);
    return `mailto:${advisorEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      body
    )}`;
  }, [advisorEmail, advisorName, breakdown, pdfProps.replacementPercent, pdfProps.retirementAge, scenarios]);

  const handleDownload = async () => {
    setGenerating(true);
    setError(null);
    try {
      // Lazy imports so @react-pdf/renderer never runs during SSR/build.
      const [{ pdf }, { default: ReportPDF }, React] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/ReportPDF"),
        import("react"),
      ]);
      const element = React.createElement(ReportPDF, pdfProps);
      const blob = await pdf(element as unknown as Parameters<typeof pdf>[0]).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "United-Benefits-Retirement-Report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("PDF generation failed:", e);
      setError("We couldn't generate the PDF. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="report-actions space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          onClick={handleDownload}
          disabled={generating}
        >
          {generating ? "Preparing your report…" : "Download PDF report"}
        </button>

        <a href={mailtoHref} className="btn-secondary">
          Email to advisor
        </a>

        <span className="group relative">
          <button
            type="button"
            disabled
            className="btn-secondary w-full cursor-not-allowed opacity-50"
            title="Coming soon — sign in support is on the way"
          >
            Save to my account
          </button>
          <span
            role="tooltip"
            className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-navy px-3 py-1.5 text-xs text-white opacity-0 shadow transition-opacity group-hover:opacity-100"
          >
            Coming soon — sign in support is on the way
          </span>
        </span>

        <a
          href="https://unitedbenefits.com/contact/"
          target="_blank"
          rel="noopener noreferrer"
          className="btn bg-mulberry text-white hover:bg-[#7d1b19] focus-visible:ring-mulberry"
        >
          Schedule a call →
        </a>
      </div>
      {error && <p className="error-text">{error}</p>}

      <p className="text-xs leading-relaxed text-gray-500">
        This report is for educational purposes only and does not constitute financial, tax, or
        investment advice. Estimates use standard FERS formulas, approximate FEGLI/term rates, and
        constant return and inflation assumptions. Actual benefits are determined by OPM, SSA, and
        your agency. Please consult a United Benefits advisor about your specific situation.
      </p>
    </div>
  );
}
