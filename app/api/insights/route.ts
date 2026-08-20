import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildMockInsights,
  extractJson,
  isAdvisorInsights,
  type InsightsPayload,
} from "@/lib/insights";
import { BENEFIT_LABELS, PRIORITY_LABELS } from "@/lib/profile";
import type { BenefitKey, BenefitSelection, PriorityKey } from "@/types";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-5";

const SYSTEM_PROMPT = `You are a warm, professional financial-wellness advisor at United Benefits, writing for federal employees and their families. Your role is educational encouragement, NOT licensed financial advice — never present yourself as a licensed advisor and never guarantee outcomes.

Guidelines:
- Write in plain, friendly, jargon-free language.
- Be specific to the person's data. Reference their own words, priorities, benefits choices, and numbers.
- NEVER invent numbers. Only use figures provided in the input.
- Pay special attention to federal benefits the person is "not-using" or "unsure" about — especially disability insurance, long-term care insurance, and getting the full TSP match (5% for FERS employees).
- Keep a hopeful, non-judgmental tone. People should feel encouraged to act, never shamed.

You must respond with STRICT JSON only (no markdown, no code fences, no commentary) matching exactly this shape:
{
  "summary": string,            // 2-3 sentence personal overview of their situation
  "benefitGaps": [{"title": string, "detail": string}],  // focus on not-using/unsure benefits
  "goalAlignment": string,      // ties their own words and priorities to the numbers
  "actionSteps": [{"step": string, "why": string}],      // 3-5 prioritized steps
  "encouragement": string       // 1-2 warm closing sentences
}`;

function describeBenefits(benefits: InsightsPayload["benefits"]): string {
  const lines: string[] = [];
  for (const key of Object.keys(BENEFIT_LABELS) as BenefitKey[]) {
    const sel = benefits[key] as BenefitSelection | undefined;
    if (!sel) continue;
    let line = `- ${BENEFIT_LABELS[key]}: ${sel.status ?? "not answered"}`;
    if (key === "tsp" && sel.tspFullMatch) {
      line += ` (contributing at least 5% for the full match: ${sel.tspFullMatch})`;
    }
    lines.push(line);
  }
  return lines.join("\n");
}

function buildUserPrompt(p: InsightsPayload): string {
  const { about, goals, assetsSummary, results } = p;
  const priorities = (goals.priorities || [])
    .map((k: PriorityKey) => PRIORITY_LABELS[k])
    .filter(Boolean)
    .join(", ");

  return `Here is the client's profile and computed retirement projection. Write their personalized insights.

ABOUT
- Current age: ${about.currentAge}
- Target retirement age: ${about.retirementAge} (${results.years} years away)
- Marital status: ${about.maritalStatus ?? "not provided"}
- Federal employee status: ${about.federalStatus ?? "not provided"}
- Agency: ${about.agency || "not provided"}
- Years of federal service: ${about.yearsOfService ?? "not provided"}

FEDERAL BENEFITS ENGAGEMENT
${describeBenefits(p.benefits)}

RETIREMENT GOALS
- Lifestyle: ${goals.lifestyle ?? "not selected"}
- Desired monthly spending (today's dollars): $${goals.monthlySpend}
- Home paid off by retirement: ${goals.homePaidOff ? "yes" : `no (expected monthly housing: $${goals.monthlyHousing})`}
- Expected monthly Social Security / pension income: $${goals.monthlySocialSecurity}
- In their own words, their ideal retirement: ${goals.idealRetirement.trim() || "(not provided)"}
- Their biggest financial worry: ${goals.biggestWorry.trim() || "(not provided)"}
- Top priorities: ${priorities || "(none selected)"}

CURRENT SITUATION (summary)
- Total current balance across accounts: $${Math.round(assetsSummary.totalCurrentBalance)}
- Total monthly contributions (monthly-equivalent): $${Math.round(assetsSummary.totalMonthlyContribution)}
- Annual employer match: $${Math.round(assetsSummary.annualEmployerMatch)}
- Account types: ${assetsSummary.accountTypes.join(", ") || "none"}

COMPUTED RESULTS
- Projected savings at retirement: $${Math.round(results.projected)}
- Estimated nest egg needed: $${Math.round(results.needed)}
- Readiness: ${Math.round(results.percent)}% of goal — band: ${results.band}
- Gap: $${Math.round(results.gap)}
- Extra monthly contribution to close the gap: ${Number.isFinite(results.extraMonthlyToClose) ? `$${Math.round(results.extraMonthlyToClose)}` : "n/a"}
- Sustainable monthly income from savings: $${Math.round(results.sustainableMonthlyIncome)}
- Estimated monthly need at retirement (inflation-adjusted): $${Math.round(results.netNeedAtRetirementMonthly)}

Respond with STRICT JSON only.`;
}

export async function POST(request: Request) {
  let payload: InsightsPayload;
  try {
    payload = (await request.json()) as InsightsPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload || !payload.about || !payload.goals || !payload.results) {
    return NextResponse.json({ error: "Missing required profile fields" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  // No key configured → deterministic mock so local dev works end-to-end.
  if (!apiKey) {
    return NextResponse.json(buildMockInsights(payload));
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      temperature: 0.7,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(payload) }],
    });

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("\n");

    let parsed: unknown;
    try {
      parsed = extractJson(text);
    } catch {
      return NextResponse.json(
        { error: "The advisor response could not be parsed. Please try again." },
        { status: 502 }
      );
    }

    if (!isAdvisorInsights(parsed)) {
      return NextResponse.json(
        { error: "The advisor response was incomplete. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ...parsed, mock: false });
  } catch (err) {
    console.error("Insights API error:", err);
    return NextResponse.json(
      { error: "We couldn't generate insights right now. Please try again." },
      { status: 502 }
    );
  }
}
