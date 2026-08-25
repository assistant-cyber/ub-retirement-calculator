/**
 * POST /api/ai/ss-estimate — estimate Social Security benefits at 62 / FRA /
 * 70 via Claude, cross-checked against the deterministic bend-point
 * approximation. If Claude's numbers deviate >40% from the deterministic
 * fallback, the fallback wins (usedFallback: true). Mock mode (no API key)
 * returns the fallback directly.
 */

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { extractJson } from "@/lib/insights";
import { ssEstimateApprox, SS_FRA } from "@/lib/fers-calculations";
import type { SSEstimateResponse } from "@/types/federal";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are a Social Security benefit estimation assistant. Given a person's current age, salary, and years of federal service, estimate their monthly Social Security benefit at age 62, at Full Retirement Age (FRA), and at age 70 using the standard SSA bend-point formula logic:
- Approximate AIME from current salary (capped at the taxable maximum, ~$168,600 for 2024) as a proxy for career-average indexed earnings, scaled by career length relative to a 35-year career.
- PIA = 90% of the first bend point ($1,174/mo) + 32% between $1,174 and $7,078 + 15% above.
- Benefit at 62 ≈ 70% of PIA; at FRA (67) = PIA; at 70 ≈ 124% of PIA.

Respond with STRICT JSON only (no markdown, no code fences) matching exactly:
{
  "at62": number,     // monthly dollars, rounded
  "atFRA": number,
  "at70": number,
  "fra": number,      // e.g. 67
  "notes": string     // 1-2 sentences of caveats in plain English
}`;

interface RequestBody {
  age?: number;
  salary?: number;
  scd?: string;
  yearsOfService?: number;
}

function isClaudeEstimate(
  v: unknown
): v is { at62: number; atFRA: number; at70: number; fra: number; notes: string } {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.at62 === "number" &&
    typeof o.atFRA === "number" &&
    typeof o.at70 === "number"
  );
}

function deviates(a: number, b: number, tolerance = 0.4): boolean {
  if (b === 0) return a !== 0;
  return Math.abs(a - b) / b > tolerance;
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { age, salary, yearsOfService } = body;
  if (
    typeof age !== "number" ||
    typeof salary !== "number" ||
    age <= 0 ||
    salary < 0
  ) {
    return NextResponse.json(
      { error: "age and salary are required numbers" },
      { status: 400 }
    );
  }

  const yos = typeof yearsOfService === "number" ? yearsOfService : 0;

  // Deterministic bend-point approximation — always computed server-side.
  const fallback = ssEstimateApprox(salary, age, yos);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const mock: SSEstimateResponse = {
      at62: fallback.at62,
      atFRA: fallback.atFRA,
      at70: fallback.at70,
      fra: SS_FRA,
      notes:
        "Deterministic bend-point approximation (no AI key configured). Actual benefits depend on your full earnings history — check ssa.gov for your official estimate.",
      fallback,
      usedFallback: true,
      mock: true,
    };
    return NextResponse.json(mock);
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 800,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Estimate Social Security benefits for:
- Current age: ${age}
- Current annual salary: $${Math.round(salary)}
- Years of federal service so far: ${yos}
- Service computation date: ${body.scd ?? "not provided"}

Respond with STRICT JSON only.`,
        },
      ],
    });

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("\n");

    let parsed: unknown;
    try {
      parsed = extractJson(text);
    } catch {
      parsed = null;
    }

    if (!isClaudeEstimate(parsed)) {
      const resp: SSEstimateResponse = {
        at62: fallback.at62,
        atFRA: fallback.atFRA,
        at70: fallback.at70,
        fra: SS_FRA,
        notes: "AI estimate unavailable; using deterministic bend-point approximation.",
        fallback,
        usedFallback: true,
        mock: false,
      };
      return NextResponse.json(resp);
    }

    // Sanity cross-check: >40% deviation from deterministic → use fallback.
    const usedFallback =
      deviates(parsed.at62, fallback.at62) ||
      deviates(parsed.atFRA, fallback.atFRA) ||
      deviates(parsed.at70, fallback.at70);

    const resp: SSEstimateResponse = usedFallback
      ? {
          at62: fallback.at62,
          atFRA: fallback.atFRA,
          at70: fallback.at70,
          fra: SS_FRA,
          notes:
            "AI estimate deviated significantly from the standard bend-point formula; showing the deterministic approximation instead.",
          fallback,
          usedFallback: true,
          mock: false,
        }
      : {
          at62: Math.round(parsed.at62),
          atFRA: Math.round(parsed.atFRA),
          at70: Math.round(parsed.at70),
          fra: typeof parsed.fra === "number" ? parsed.fra : SS_FRA,
          notes: typeof parsed.notes === "string" ? parsed.notes : "",
          fallback,
          usedFallback: false,
          mock: false,
        };

    return NextResponse.json(resp);
  } catch (err) {
    console.error("SS estimate API error:", err);
    const resp: SSEstimateResponse = {
      at62: fallback.at62,
      atFRA: fallback.atFRA,
      at70: fallback.at70,
      fra: SS_FRA,
      notes: "AI estimate unavailable; using deterministic bend-point approximation.",
      fallback,
      usedFallback: true,
      mock: false,
    };
    return NextResponse.json(resp);
  }
}
