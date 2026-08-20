/**
 * Branded United Benefits PDF report, rendered client-side with
 * @react-pdf/renderer. Uses built-in Helvetica for reliability.
 */

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type {
  AboutState,
  AdvisorInsights,
  BenefitsState,
} from "@/types";
import type { ResultsSummary } from "@/lib/calc";
import { BENEFIT_LABELS, BENEFIT_ORDER } from "@/lib/profile";

const NAVY = "#21205f";
const MULBERRY = "#9c221f";
const GOLD = "#c9a227";
const GREEN = "#2e7d4f";
const GRAY = "#6b7280";
const LIGHT = "#f7f7f9";

const BAND_COLORS: Record<string, string> = {
  "on-track": GREEN,
  "getting-close": GOLD,
  "needs-attention": MULBERRY,
};

const BAND_LABELS: Record<string, string> = {
  "on-track": "On track",
  "getting-close": "Getting close",
  "needs-attention": "Needs attention",
};

const usd = (n: number) =>
  `$${Math.round(n).toLocaleString("en-US")}`;

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1f2937",
    paddingTop: 36,
    paddingHorizontal: 48,
    paddingBottom: 64,
    backgroundColor: "#ffffff",
  },
  headerBand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  logo: { height: 40, width: 133 },
  headerDate: { fontSize: 9, color: GRAY },
  rule: { height: 3, backgroundColor: NAVY, marginBottom: 20 },
  title: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    color: NAVY,
    marginBottom: 4,
  },
  preparedFor: { fontSize: 10, color: GRAY, marginBottom: 20 },
  bigRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  bigBox: {
    flex: 1,
    backgroundColor: LIGHT,
    borderRadius: 6,
    padding: 14,
  },
  bigLabel: { fontSize: 9, color: GRAY, marginBottom: 4 },
  bigValue: { fontFamily: "Helvetica-Bold", fontSize: 20 },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    color: NAVY,
    marginTop: 16,
    marginBottom: 8,
  },
  bodyText: { fontSize: 10, lineHeight: 1.5, color: "#374151" },
  meterOuter: {
    height: 10,
    backgroundColor: "#e5e7eb",
    borderRadius: 5,
    marginTop: 6,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
    marginTop: 2,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: NAVY,
    paddingVertical: 10,
    paddingHorizontal: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: { color: "#ffffff", fontSize: 8 },
  gapItem: { flexDirection: "row", marginBottom: 8 },
  bullet: { width: 12, fontSize: 10, color: MULBERRY },
  stepNum: {
    width: 16,
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: NAVY,
  },
  italic: { fontFamily: "Helvetica-Oblique", fontSize: 10, color: "#374151", lineHeight: 1.5 },
});

const STATUS_META: Record<string, { color: string; label: string }> = {
  using: { color: GREEN, label: "Using it" },
  "not-using": { color: MULBERRY, label: "Not using it" },
  unsure: { color: GOLD, label: "Not sure" },
};

function Footer() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        United Benefits • unitedbenefits.com • Educational estimate only — not financial advice.
      </Text>
      <Text
        style={styles.footerText}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </View>
  );
}

const LOGO_SRC =
  typeof window !== "undefined"
    ? `${window.location.origin}/images/ub-logo.png`
    : "/images/ub-logo.png";

function Header({ dateStr }: { dateStr: string }) {
  return (
    <>
      <View style={styles.headerBand}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image style={styles.logo} src={LOGO_SRC} />
        <Text style={styles.headerDate}>{dateStr}</Text>
      </View>
      <View style={styles.rule} />
    </>
  );
}

export interface ReportPDFProps {
  about: AboutState;
  benefits: BenefitsState;
  results: ResultsSummary;
  insights: AdvisorInsights | null;
}

export default function ReportPDF({ about, benefits, results, insights }: ReportPDFProps) {
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const bandColor = BAND_COLORS[results.band] ?? NAVY;
  const bandLabel = BAND_LABELS[results.band] ?? results.band;
  const marital =
    about.maritalStatus === "married" ? "Married" : about.maritalStatus === "single" ? "Single" : "—";

  return (
    <Document title="United Benefits Retirement Readiness Report">
      {/* ---------- Page 1: Numbers ---------- */}
      <Page size="LETTER" style={styles.page}>
        <Header dateStr={dateStr} />
        <Text style={styles.title}>Retirement Readiness Report</Text>
        <Text style={styles.preparedFor}>
          Prepared for a {about.currentAge}-year-old ({marital}), targeting retirement at age{" "}
          {about.retirementAge} • {dateStr}
        </Text>

        <View style={styles.bigRow}>
          <View style={styles.bigBox}>
            <Text style={styles.bigLabel}>Projected savings at age {about.retirementAge}</Text>
            <Text style={[styles.bigValue, { color: bandColor }]}>{usd(results.projected)}</Text>
          </View>
          <View style={styles.bigBox}>
            <Text style={styles.bigLabel}>Estimated amount needed</Text>
            <Text style={[styles.bigValue, { color: NAVY }]}>{usd(results.needed)}</Text>
          </View>
        </View>

        <View style={{ marginBottom: 4, flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11, color: bandColor }}>
            {bandLabel}
          </Text>
          <Text style={{ fontSize: 11, color: GRAY }}>
            {Math.round(results.percent)}% of goal
          </Text>
        </View>
        <View style={styles.meterOuter}>
          <View
            style={{
              height: 10,
              borderRadius: 5,
              width: `${Math.min(100, (results.barPercent / 150) * 100)}%`,
              backgroundColor: bandColor,
            }}
          />
        </View>

        <Text style={styles.sectionTitle}>Monthly income in retirement</Text>
        <View style={styles.bigRow}>
          <View style={styles.bigBox}>
            <Text style={styles.bigLabel}>Sustainable monthly income from savings</Text>
            <Text style={[styles.bigValue, { fontSize: 16, color: NAVY }]}>
              {usd(results.sustainableMonthlyIncome)}
            </Text>
          </View>
          <View style={styles.bigBox}>
            <Text style={styles.bigLabel}>Estimated monthly need at retirement</Text>
            <Text style={[styles.bigValue, { fontSize: 16, color: NAVY }]}>
              {usd(results.netNeedAtRetirementMonthly)}
            </Text>
          </View>
        </View>

        {results.gap > 0 ? (
          <Text style={[styles.bodyText, { color: MULBERRY }]}>
            Gap to close: {usd(results.gap)}.
            {Number.isFinite(results.extraMonthlyToClose)
              ? ` Contributing about ${usd(results.extraMonthlyToClose)} more per month could close the gap by age ${about.retirementAge}.`
              : ""}
          </Text>
        ) : (
          <Text style={[styles.bodyText, { color: GREEN }]}>
            You are projected to meet or exceed your retirement goal. Keep it up!
          </Text>
        )}

        <Footer />
      </Page>

      {/* ---------- Page 2: Benefits + Insights ---------- */}
      <Page size="LETTER" style={styles.page}>
        <Header dateStr={dateStr} />

        <Text style={styles.sectionTitle}>Federal benefits engagement</Text>
        <View style={{ marginBottom: 8 }}>
          {BENEFIT_ORDER.map((key) => {
            const sel = benefits[key];
            const meta = sel?.status ? STATUS_META[sel.status] : null;
            return (
              <View key={key} style={styles.row}>
                <Text style={{ fontSize: 10 }}>{BENEFIT_LABELS[key]}</Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {meta && <View style={[styles.dot, { backgroundColor: meta.color }]} />}
                  <Text style={{ fontSize: 10, color: meta ? meta.color : GRAY }}>
                    {meta ? meta.label : "Not answered"}
                    {key === "tsp" && sel?.tspFullMatch
                      ? `  (5%+ match: ${sel.tspFullMatch === "yes" ? "yes" : sel.tspFullMatch === "no" ? "no" : "not sure"})`
                      : ""}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {insights ? (
          <>
            <Text style={styles.sectionTitle}>Your Personalized Advisor Insights</Text>
            <Text style={styles.bodyText}>{insights.summary}</Text>

            {insights.benefitGaps.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Benefit gaps to review</Text>
                {insights.benefitGaps.map((g, i) => (
                  <View key={i} style={styles.gapItem}>
                    <Text style={styles.bullet}>•</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10 }}>{g.title}</Text>
                      <Text style={styles.bodyText}>{g.detail}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            <Text style={styles.sectionTitle}>Your goals &amp; your numbers</Text>
            <Text style={styles.bodyText}>{insights.goalAlignment}</Text>

            <Text style={styles.sectionTitle}>Recommended next steps</Text>
            {insights.actionSteps.map((s, i) => (
              <View key={i} style={styles.gapItem}>
                <Text style={styles.stepNum}>{i + 1}.</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10 }}>{s.step}</Text>
                  <Text style={styles.bodyText}>{s.why}</Text>
                </View>
              </View>
            ))}

            <Text style={[styles.italic, { marginTop: 10 }]}>{insights.encouragement}</Text>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Your Personalized Advisor Insights</Text>
            <Text style={styles.bodyText}>
              Personalized insights were not available when this report was generated. Schedule a
              free benefits review at unitedbenefits.com/contact to walk through your numbers with
              an advisor.
            </Text>
          </>
        )}

        <Footer />
      </Page>
    </Document>
  );
}
