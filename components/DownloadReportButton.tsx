"use client";

import { useState } from "react";
import type { AboutState, AdvisorInsights, BenefitsState } from "@/types";
import type { ResultsSummary } from "@/lib/calc";

interface Props {
  about: AboutState;
  benefits: BenefitsState;
  results: ResultsSummary;
  insights: AdvisorInsights | null;
  /** Disabled while insights are still loading (unless loading failed). */
  disabled: boolean;
}

/**
 * Generates the branded PDF entirely client-side. @react-pdf/renderer and
 * the ReportPDF document are imported lazily inside the click handler so
 * they never run during SSR / the server build.
 */
export default function DownloadReportButton({
  about,
  benefits,
  results,
  insights,
  disabled,
}: Props) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setGenerating(true);
    setError(null);
    try {
      const [{ pdf }, { default: ReportPDF }, React] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/ReportPDF"),
        import("react"),
      ]);
      const element = React.createElement(ReportPDF, { about, benefits, results, insights });
      // ReportPDF renders a <Document>, but TS can't see that through createElement.
      const blob = await pdf(
        element as unknown as Parameters<typeof pdf>[0]
      ).toBlob();
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
    <div className="text-center">
      <button
        type="button"
        className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
        onClick={handleDownload}
        disabled={disabled || generating}
      >
        {generating ? "Preparing your report…" : "Download Your UB Retirement Report (PDF)"}
      </button>
      {disabled && !generating && (
        <p className="mt-2 text-sm text-gray-500">
          Available once your advisor insights finish loading.
        </p>
      )}
      {error && <p className="error-text mt-2">{error}</p>}
    </div>
  );
}
