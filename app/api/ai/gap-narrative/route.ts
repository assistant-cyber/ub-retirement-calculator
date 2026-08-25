/**
 * POST /api/ai/gap-narrative — plain-English narratives for the gap analysis
 * and risk sections, plus top-3 recommendations. Deterministic mock fallback
 * when ANTHROPIC_API_KEY is missing.
 */

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { extractJson } from "@/lib/insights";
import {
  buildMockGapNarrative,
  type GapNarrativePayload,
} from "@/lib/gap-narrative-mock";
import type { GapNarrativeResponse } from "@/types/federal";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are a warm, professional financial-wellness writer at United Benefits, writing for federal employees. Educational encouragement only — never licensed financial advice, never guarantee outcomes, never invent numbers (only use figures provided).

Respond with STRICT JSON only (no markdown, no code fences) matching exactly:
{
  "gapNarrative": string,       // 3-4 sentences, plain English, summarizing the income gap analysis
  "riskNarrative": string,      // 1 paragraph on FEGLI / disability / insurance risk based on age, enrollment, and income
  "topRecommendations": [{"title": string, "detail": string}]   // exactly 3, prioritized
}`;

function isGapNarrativeResponse(v: unknown): v is GapNarrativeResponse {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.gapNarrative === "string" &&
    typeof o.riskNarrative === "string" &&
    Array.isArray(o.topRecommendations)
  );
}

export async function POST(request: Request) {
  let payload: GapNarrativePayload;
  try {
    payload = (await request.json()) as GapNarrativePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Missing payload" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(buildMockGapNarrative(payload));
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      temperature: 0.7,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here is the computed gap and risk summary for a federal employee. Write their narratives.

${JSON.stringify(payload, null, 2)}

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
      return NextResponse.json(buildMockGapNarrative(payload));
    }

    if (!isGapNarrativeResponse(parsed)) {
      return NextResponse.json(buildMockGapNarrative(payload));
    }

    return NextResponse.json({ ...parsed, mock: false });
  } catch (err) {
    console.error("Gap narrative API error:", err);
    return NextResponse.json(buildMockGapNarrative(payload));
  }
}
