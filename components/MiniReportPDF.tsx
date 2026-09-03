"use client";

import { useState } from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Font,
} from "@react-pdf/renderer";
import type { WizardState } from "@/components/wizard-state";

// Register fonts (same as full report)
Font.register({
  family: "Open Sans",
  fonts: [
    { src: "https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-regular.ttf" },
    { src: "https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-600.ttf", fontWeight: 600 },
    { src: "https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-700.ttf", fontWeight: 700 },
  ],
});

const navy = "#21205f";
const mulberry = "#9c221f";
const green = "#2e7d4f";

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Open Sans", fontSize: 10, color: "#333" },
  header: { marginBottom: 20, borderBottomWidth: 2, borderBottomColor: navy, paddingBottom: 10 },
  title: { fontSize: 20, fontWeight: 700, color: navy },
  subtitle: { fontSize: 11, color: "#666", marginTop: 4 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: navy, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: "#ddd", paddingBottom: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  label: { color: "#666" },
  value: { fontWeight: 600 },
  valueGreen: { fontWeight: 600, color: green },
  valueRed: { fontWeight: 600, color: mulberry },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridItem: { width: "48%", backgroundColor: "#f5f5f5", padding: 8, borderRadius: 4 },
  gridLabel: { fontSize: 8, color: "#666" },
  gridValue: { fontSize: 14, fontWeight: 700, color: navy },
  cta: { marginTop: 20, padding: 12, backgroundColor: navy, borderRadius: 6 },
  ctaText: { color: "#fff", fontSize: 11, textAlign: "center" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 8, color: "#999", textAlign: "center" },
});

interface Props {
  state: WizardState;
  mra: number;
  service: number;
  eligibilityStatus: string;
  eligibilityDate: string | null;
  pensionMonthly: number;
  fegliCoverage: number;
  fegliCost: number;
  gettingFullMatch: boolean;
  matchTotal: number;
  matchMissed: number;
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function MiniReportDocument({
  state,
  mra,
  service,
  eligibilityStatus,
  eligibilityDate,
  pensionMonthly,
  fegliCoverage,
  fegliCost,
  gettingFullMatch,
  matchTotal,
  matchMissed,
}: Props) {
  const { federal, tsp, fegli } = state;
  const tspPct =
    tsp.contributionMode === "percent"
      ? tsp.contributionValue
      : federal.salary > 0
        ? (tsp.contributionValue / federal.salary) * 100
        : 0;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Mini Retirement Report</Text>
          <Text style={styles.subtitle}>
            Prepared for federal employee • {new Date().toLocaleDateString()}
          </Text>
        </View>

        {/* Eligibility Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FERS Retirement Eligibility</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Minimum Retirement Age</Text>
              <Text style={styles.gridValue}>Age {mra}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Current Service</Text>
              <Text style={styles.gridValue}>{service.toFixed(1)} years</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>First Eligible</Text>
              <Text style={[styles.gridValue, { color: green }]}>{eligibilityStatus}</Text>
              {eligibilityDate && <Text style={styles.gridLabel}>{eligibilityDate}</Text>}
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Est. Monthly Pension</Text>
              <Text style={styles.gridValue}>{fmt(pensionMonthly)}</Text>
            </View>
          </View>
        </View>

        {/* TSP Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TSP Summary</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Current Balance</Text>
            <Text style={styles.value}>{fmt(tsp.balance)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Contribution Rate</Text>
            <Text style={styles.value}>{tspPct.toFixed(1)}% ({tsp.taxType})</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Agency Match</Text>
            <Text style={gettingFullMatch ? styles.valueGreen : styles.valueRed}>
              {gettingFullMatch
                ? `✓ Full match: ${fmt(matchTotal)}/year`
                : `⚠ Missing ${fmt(matchMissed)}/year`}
            </Text>
          </View>
        </View>

        {/* FEGLI Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FEGLI Life Insurance</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Coverage Amount</Text>
            <Text style={styles.value}>{fmt(fegliCoverage)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Enrollment</Text>
            <Text style={styles.value}>
              {fegli.enrollment.toUpperCase()}
              {fegli.optionBMultiple > 0 && ` (${fegli.optionBMultiple}x Option B)`}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Annual Premium</Text>
            <Text style={styles.value}>{fmt(fegliCost)}/year</Text>
          </View>
        </View>

        {/* CTA */}
        <View style={styles.cta}>
          <Text style={styles.ctaText}>
            Want the full picture? Continue for Income Gap Analysis, TSP Projections,
            Social Security Scenarios, and AI-Powered Insights.
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          United Benefits • This is an estimate only and not a guarantee of benefits.
          Consult with your HR office or OPM for official calculations.
        </Text>
      </Page>
    </Document>
  );
}

export default function MiniReportPDF(props: Props) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const blob = await pdf(<MiniReportDocument {...props} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mini-retirement-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="btn-primary"
    >
      {loading ? "Generating..." : "Download PDF"}
    </button>
  );
}
