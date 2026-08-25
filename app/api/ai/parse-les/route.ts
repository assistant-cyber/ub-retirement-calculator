/**
 * POST /api/ai/parse-les — extract pay data from an uploaded Leave & Earnings
 * Statement (PDF or image) via the Anthropic API. Accepts multipart/form-data
 * (field "file") or JSON {fileBase64, mediaType}. 10MB limit.
 * Graceful mock fallback when ANTHROPIC_API_KEY is missing.
 */

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { extractJson } from "@/lib/insights";
import type { LESParseResult } from "@/types/federal";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-4-6";
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

const ALLOWED_MEDIA_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;
type AllowedMediaType = (typeof ALLOWED_MEDIA_TYPES)[number];

const SYSTEM_PROMPT = `You are a document-extraction assistant. You will be given a U.S. federal employee Leave & Earnings Statement (LES). Extract the requested fields.

Respond with STRICT JSON only (no markdown, no code fences) matching exactly:
{
  "grossPay": number | null,             // gross pay for the pay period, dollars
  "ytdEarnings": number | null,          // year-to-date earnings, dollars
  "tspContribution": number | null,      // employee TSP contribution (per pay period $ or %)
  "tspContributionType": "percent" | "dollar" | null,
  "fegliDeduction": number | null,       // FEGLI deduction for the pay period, dollars
  "payPeriod": string | null,            // e.g. "biweekly" or the pay-period dates shown
  "confidence": "high" | "medium" | "low"
}
Use null for any field you cannot find. Never invent values.`;

function mockResult(): LESParseResult {
  return {
    mock: true,
    grossPay: null,
    ytdEarnings: null,
    tspContribution: null,
    tspContributionType: null,
    fegliDeduction: null,
    payPeriod: null,
    confidence: "low",
  };
}

function isLESParseResult(v: unknown): v is LESParseResult {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    "grossPay" in o &&
    "confidence" in o &&
    ["high", "medium", "low"].includes(String(o.confidence))
  );
}

export async function POST(request: Request) {
  let fileBase64: string | null = null;
  let mediaType: string | null = null;

  const contentType = request.headers.get("content-type") || "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Missing file upload" }, { status: 400 });
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 413 });
      }
      mediaType = file.type;
      const buf = Buffer.from(await file.arrayBuffer());
      fileBase64 = buf.toString("base64");
    } else {
      const body = (await request.json()) as {
        fileBase64?: string;
        mediaType?: string;
      };
      fileBase64 = body.fileBase64 ?? null;
      mediaType = body.mediaType ?? null;
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!fileBase64 || !mediaType) {
    return NextResponse.json(
      { error: "fileBase64 and mediaType are required" },
      { status: 400 }
    );
  }
  if (!ALLOWED_MEDIA_TYPES.includes(mediaType as AllowedMediaType)) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload a PDF or image (JPEG/PNG/GIF/WebP)." },
      { status: 415 }
    );
  }
  // base64 expands ~4/3 over raw bytes
  if (fileBase64.length > (MAX_BYTES * 4) / 3 + 4) {
    return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 413 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(mockResult());
  }

  try {
    const client = new Anthropic({ apiKey });

    const fileBlock =
      mediaType === "application/pdf"
        ? {
            type: "document" as const,
            source: {
              type: "base64" as const,
              media_type: "application/pdf" as const,
              data: fileBase64,
            },
          }
        : {
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: fileBase64,
            },
          };

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1000,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            fileBlock,
            {
              type: "text",
              text: "Extract the LES fields. Respond with STRICT JSON only.",
            },
          ],
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
      return NextResponse.json(
        { error: "The LES could not be parsed. Please try again or enter values manually." },
        { status: 502 }
      );
    }

    if (!isLESParseResult(parsed)) {
      return NextResponse.json(
        { error: "The LES extraction was incomplete. Please enter values manually." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ...parsed, mock: false });
  } catch (err) {
    console.error("LES parse API error:", err);
    return NextResponse.json(
      { error: "We couldn't read your LES right now. Please try again." },
      { status: 502 }
    );
  }
}
