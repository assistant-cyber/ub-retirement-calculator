/**
 * Branded United Benefits PDF report (rebuild spec v3), rendered client-side
 * with @react-pdf/renderer. Page 1: eligibility + income breakdown.
 * Page 2: gap + risk + age-57 snapshot + narratives.
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
  EligibilityScenario,
  GapNarrativeResponse,
  IncomeBreakdown,
  Age57Snapshot,
  SSEstimateResponse,
} from "@/types/federal";

const NAVY = "#21205f";
const MULBERRY = "#9c221f";
const GOLD = "#c9a227";
const GREEN = "#2e7d4f";
const MIDBLUE = "#4a6da7";
const GRAY = "#6b7280";
const LIGHT = "#f7f7f9";

const usd = (n: number) => {
  const rounded = Math.round(n);
  const sign = rounded < 0 ? "-" : "";
  return `${sign}$${Math.abs(rounded).toLocaleString("en-US")}`;
};

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
  rule: { height: 3, backgroundColor: NAVY, marginBottom: 18 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 22, color: NAVY, marginBottom: 4 },
  preparedFor: { fontSize: 10, color: GRAY, marginBottom: 16 },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    color: NAVY,
    marginTop: 14,
    marginBottom: 8,
  },
  bodyText: { fontSize: 10, lineHeight: 1.5, color: "#374151" },
  row3: { flexDirection: "row", gap: 10, marginBottom: 10 },
  box: { flex: 1, backgroundColor: LIGHT, borderRadius: 6, padding: 10 },
  boxLabel: { fontSize: 8, color: GRAY, marginBottom: 3 },
  boxValue: { fontFamily: "Helvetica-Bold", fontSize: 14, color: NAVY },
  boxSub: { fontSize: 8, color: GRAY, marginTop: 2 },
  incomeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  meterOuter: {
    height: 10,
    backgroundColor: "#e5e7eb",
    borderRadius: 5,
    marginTop: 6,
    marginBottom: 4,
  },
  recItem: { flexDirection: "row", marginBottom: 6 },
  recNum: { width: 16, fontFamily: "Helvetica-Bold", fontSize: 10, color: NAVY },
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
});

const LOGO_SRC =
  typeof window !== "undefined"
    ? `${window.location.origin}/images/ub-logo.png`
    : "/images/ub-logo.png";

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

function IncomeRow({ color, label, monthly }: { color: string; label: string; monthly: number }) {
  return (
    <View style={styles.incomeRow}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={{ fontSize: 10 }}>{label}</Text>
      </View>
      <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10, color: NAVY }}>
        {usd(monthly)}/mo  •  {usd(monthly * 12)}/yr
      </Text>
    </View>
  );
}

export interface ReportPDFProps {
  currentAge: number;
  retirementAge: number;
  replacementPercent: number;
  system: string;
  advisorName: string;
  scenarios: EligibilityScenario[];
  breakdown: IncomeBreakdown;
  snapshot: Age57Snapshot;
  ssEstimate: SSEstimateResponse | null;
  narrative: GapNarrativeResponse | null;
  fegliAnnual: number;
  fegliTwentyYearTotal: number;
  privateTwentyYearTotal: number;
  fegliCoverage: number;
  underinsuredShortfall: number;
  disabilityCareerEarnings: number;
  fersDisabilityYear1: number;
  fersDisabilityAfter: number;
  missedMatchAnnual: number;
}

export default function ReportPDF(props: ReportPDFProps) {
  const {
    currentAge,
    retirementAge,
    replacementPercent,
    system,
    advisorName,
    scenarios,
    breakdown,
    snapshot,
    ssEstimate,
    narrative,
  } = props;

  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const hasGap = breakdown.gapMonthly > 0;
  const gapColor = hasGap ? MULBERRY : GREEN;
  const pctOfTarget =
    breakdown.targetMonthly > 0
      ? Math.min(150, (breakdown.totalMonthly / breakdown.targetMonthly) * 100)
      : 100;

  return (
    <Document title="United Benefits Retirement Report">
      {/* ---------- Page 1: Eligibility + Income ---------- */}
      <Page size="LETTER" style={styles.page}>
        <Header dateStr={dateStr} />
        <Text style={styles.title}>Your Retirement Report</Text>
        <Text style={styles.preparedFor}>
          Prepared for a {Math.floor(currentAge)}-year-old {system} employee, targeting retirement
          at age {retirementAge}
          {advisorName && advisorName !== "Not sure / Assign me one"
            ? ` • Advisor: ${advisorName}`
            : ""}{" "}
          • {dateStr}
        </Text>

        <Text style={styles.sectionTitle}>A. Your retirement eligibility</Text>
        <View style={styles.row3}>
          {scenarios.map((s) => (
            <View
              key={s.rule}
              style={[
                styles.box,
                s.earliest ? { borderWidth: 1.5, borderColor: GREEN } : {},
              ]}
            >
              <Text style={[styles.boxLabel, s.earliest ? { color: GREEN } : {}]}>
                {s.rule}
                {s.earliest ? "  •  EARLIEST" : ""}
              </Text>
              <Text style={[styles.boxValue, { fontSize: 12 }]}>{s.eligibleDate}</Text>
              <Text style={styles.boxSub}>
                Age {Math.floor(s.ageAtDate)} • ~{Math.round(s.serviceAtDate)} yrs service
                {s.yearsUntil > 0 ? ` • ${s.yearsUntil.toFixed(1)} yrs away` : " • eligible now"}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>B. Projected monthly income at {retirementAge}</Text>
        <IncomeRow color={NAVY} label="FERS Basic Pension" monthly={breakdown.pensionMonthly} />
        {breakdown.supplementMonthly > 0 && (
          <IncomeRow
            color={GOLD}
            label="FERS Supplement (ends at age 62)"
            monthly={breakdown.supplementMonthly}
          />
        )}
        <IncomeRow
          color={MIDBLUE}
          label={`Social Security (from age ${breakdown.ssStartAgeNumeric})`}
          monthly={breakdown.ssMonthly}
        />
        <IncomeRow color={MULBERRY} label="TSP drawdown (4% rule)" monthly={breakdown.tspMonthly} />
        {breakdown.outsideMonthly > 0 && (
          <IncomeRow color={GRAY} label="Outside accounts & other income" monthly={breakdown.outsideMonthly} />
        )}
        <View style={[styles.incomeRow, { borderBottomWidth: 0, marginTop: 2 }]}>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11, color: NAVY }}>
            Total projected income
          </Text>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11, color: NAVY }}>
            {usd(breakdown.totalMonthly)}/mo
          </Text>
        </View>

        {ssEstimate && (
          <>
            <Text style={styles.sectionTitle}>Social Security scenarios</Text>
            <View style={styles.row3}>
              <View style={styles.box}>
                <Text style={styles.boxLabel}>Claim at 62</Text>
                <Text style={styles.boxValue}>{usd(ssEstimate.at62)}/mo</Text>
              </View>
              <View style={styles.box}>
                <Text style={styles.boxLabel}>At FRA ({ssEstimate.fra})</Text>
                <Text style={styles.boxValue}>{usd(ssEstimate.atFRA)}/mo</Text>
              </View>
              <View style={styles.box}>
                <Text style={styles.boxLabel}>At 70</Text>
                <Text style={styles.boxValue}>{usd(ssEstimate.at70)}/mo</Text>
              </View>
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Key projections</Text>
        <View style={styles.row3}>
          <View style={styles.box}>
            <Text style={styles.boxLabel}>Projected TSP at {retirementAge}</Text>
            <Text style={styles.boxValue}>{usd(breakdown.tspBalanceAtRetirement)}</Text>
          </View>
          <View style={styles.box}>
            <Text style={styles.boxLabel}>Projected High-3 salary</Text>
            <Text style={styles.boxValue}>{usd(breakdown.high3)}</Text>
          </View>
          <View style={styles.box}>
            <Text style={styles.boxLabel}>Service at retirement</Text>
            <Text style={styles.boxValue}>~{Math.round(breakdown.serviceAtRetirement)} yrs</Text>
          </View>
        </View>

        <Footer />
      </Page>

      {/* ---------- Page 2: Gap + Risk + Age-57 + Narratives ---------- */}
      <Page size="LETTER" style={styles.page}>
        <Header dateStr={dateStr} />

        <Text style={styles.sectionTitle}>C. Gap analysis</Text>
        <View style={styles.row3}>
          <View style={styles.box}>
            <Text style={styles.boxLabel}>
              Target ({Math.round(replacementPercent * 100)}% of final salary)
            </Text>
            <Text style={styles.boxValue}>{usd(breakdown.targetMonthly)}/mo</Text>
          </View>
          <View style={styles.box}>
            <Text style={styles.boxLabel}>Projected income</Text>
            <Text style={styles.boxValue}>{usd(breakdown.totalMonthly)}/mo</Text>
          </View>
          <View style={styles.box}>
            <Text style={styles.boxLabel}>{hasGap ? "Gap" : "Surplus"}</Text>
            <Text style={[styles.boxValue, { color: gapColor }]}>
              {usd(Math.abs(breakdown.gapMonthly))}/mo
            </Text>
          </View>
        </View>
        <View style={styles.meterOuter}>
          <View
            style={{
              height: 10,
              borderRadius: 5,
              width: `${Math.min(100, pctOfTarget)}%`,
              backgroundColor: gapColor,
            }}
          />
        </View>
        <Text style={{ fontSize: 9, color: GRAY, marginBottom: 6 }}>
          {Math.round(pctOfTarget)}% of your income target
        </Text>
        {props.missedMatchAnnual > 0 && (
          <Text style={[styles.bodyText, { color: MULBERRY }]}>
            TSP match alert: you are missing {usd(props.missedMatchAnnual)}/year in free agency
            match by contributing under 5%.
          </Text>
        )}
        {narrative?.gapNarrative && (
          <Text style={[styles.bodyText, { marginTop: 4 }]}>{narrative.gapNarrative}</Text>
        )}

        <Text style={styles.sectionTitle}>D. Risk analysis</Text>
        <View style={styles.row3}>
          <View style={styles.box}>
            <Text style={styles.boxLabel}>FEGLI annual premium now</Text>
            <Text style={styles.boxValue}>{usd(props.fegliAnnual)}</Text>
            <Text style={styles.boxSub}>{usd(props.fegliCoverage)} coverage</Text>
          </View>
          <View style={styles.box}>
            <Text style={styles.boxLabel}>20-yr FEGLI vs private term</Text>
            <Text style={[styles.boxValue, { fontSize: 12 }]}>
              {usd(props.fegliTwentyYearTotal)} vs {usd(props.privateTwentyYearTotal)}
            </Text>
          </View>
          <View style={styles.box}>
            <Text style={styles.boxLabel}>Career earnings at risk (disability)</Text>
            <Text style={[styles.boxValue, { color: MULBERRY, fontSize: 12 }]}>
              {usd(props.disabilityCareerEarnings)}
            </Text>
          </View>
        </View>
        <Text style={styles.bodyText}>
          Federal benefits do not include disability insurance. FERS disability retirement pays
          roughly 60% of High-3 in year 1 ({usd(props.fersDisabilityYear1)}/yr) and 40% thereafter
          ({usd(props.fersDisabilityAfter)}/yr).
          {props.underinsuredShortfall > 0
            ? ` Your death benefit is about ${usd(props.underinsuredShortfall)} below the recommended 10× income level.`
            : " Your death benefit meets the 10× income rule of thumb."}
        </Text>
        {narrative?.riskNarrative && (
          <Text style={[styles.bodyText, { marginTop: 4 }]}>{narrative.riskNarrative}</Text>
        )}

        <Text style={styles.sectionTitle}>E. At age 57 — what your income could look like</Text>
        <View style={styles.row3}>
          <View style={styles.box}>
            <Text style={styles.boxLabel}>Projected salary at 57</Text>
            <Text style={styles.boxValue}>{usd(snapshot.projectedSalaryAt57)}</Text>
          </View>
          <View style={styles.box}>
            <Text style={styles.boxLabel}>Income at 57 (pension + suppl. + TSP)</Text>
            <Text style={styles.boxValue}>{usd(snapshot.totalMonthly)}/mo</Text>
          </View>
          <View style={styles.box}>
            <Text style={styles.boxLabel}>Replacement achieved</Text>
            <Text
              style={[
                styles.boxValue,
                {
                  color:
                    snapshot.replacementPercentAchieved >= 0.7 ? GREEN : MULBERRY,
                },
              ]}
            >
              {Math.round(snapshot.replacementPercentAchieved * 100)}%
            </Text>
            <Text style={styles.boxSub}>vs 70–80% recommended</Text>
          </View>
        </View>

        {narrative && narrative.topRecommendations.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Top recommendations</Text>
            {narrative.topRecommendations.map((r, i) => (
              <View key={i} style={styles.recItem}>
                <Text style={styles.recNum}>{i + 1}.</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10 }}>{r.title}</Text>
                  <Text style={styles.bodyText}>{r.detail}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        <Footer />
      </Page>
    </Document>
  );
}
