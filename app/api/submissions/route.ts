import { NextResponse } from "next/server";
import { supabaseConfigured, supabaseRest } from "@/lib/supabase-server";

export const runtime = "nodejs";

/**
 * POST /api/submissions — persist a completed calculator run.
 *
 * Body: { intake, state, results, aiNarratives } from the client.
 * Maps the wizard state onto the flat `submissions` columns
 * (see supabase/schema.sql). Never blocks the UI: the client fires
 * this in the background when the report is generated.
 */

interface IntakeInfo {
  filler?: string;
  name?: string;
  phone?: string;
  email?: string;
  description?: string;
}

function str(v: unknown, max = 500): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export async function POST(req: Request) {
  if (!supabaseConfigured()) {
    return NextResponse.json({ saved: false, reason: "not-configured" }, { status: 200 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const intake = (body.intake ?? {}) as IntakeInfo;
  const state = (body.state ?? {}) as Record<string, any>;
  const federal = state.federal ?? {};
  const tsp = state.tsp ?? {};
  const fegli = state.fegli ?? {};
  const goals = state.goals ?? {};
  const outside = state.outside ?? {};

  const fillerType = intake.filler === "advisor" ? "advisor" : "individual";
  const contactName = str(intake.name, 200);
  const contactEmail = str(intake.email, 200);
  const contactPhone = str(intake.phone, 50);
  if (!contactName || !contactEmail || !contactPhone) {
    return NextResponse.json({ error: "Missing intake contact fields" }, { status: 400 });
  }

  // Resolve advisor_id from name (best effort)
  let advisorId: string | null = null;
  const advisorName = str(state.advisorName, 200);
  try {
    const rows = await supabaseRest<{ id: string }[]>("advisors", {
      query: `select=id&name=eq.${encodeURIComponent(advisorName)}&limit=1`,
    });
    advisorId = rows[0]?.id ?? null;
  } catch {
    // non-fatal
  }

  const row = {
    filler_type: fillerType,
    contact_name: contactName,
    contact_phone: contactPhone,
    contact_email: contactEmail,
    description: str(intake.description, 500),
    advisor_id: advisorId,
    advisor_name: advisorName,

    dob: str(federal.dob, 10) || null,
    scd: str(federal.scd, 10) || null,
    marital_status: federal.maritalStatus === "married" ? "married" : "single",
    dependents: String(federal.dependents ?? "0"),
    union_affiliation: str(federal.union, 40),
    federal_status: str(federal.federalStatus, 40),
    military_years: num(federal.militaryYears),
    salary: num(federal.salary),

    retirement_system: ["FERS", "CSRS", "FERS-RAE"].includes(federal.system)
      ? federal.system
      : "FERS",
    tsp_balance: num(tsp.balance),
    tsp_contribution_mode: tsp.contributionMode === "dollar" ? "dollar" : "percent",
    tsp_contribution_value: num(tsp.contributionValue),
    tsp_tax_type: ["roth", "traditional", "split"].includes(tsp.taxType)
      ? tsp.taxType
      : "traditional",
    tsp_full_match: Boolean(tsp.fullMatch),
    tsp_allocation: Array.isArray(tsp.allocation) ? tsp.allocation.map((a: unknown) => str(a, 20)) : [],
    fegli_enrollment: str(fegli.enrollment, 20),
    fegli_option_b_multiple: num(fegli.optionBMultiple) || null,
    fehb: Boolean(state.fehb),
    hsa: Boolean(state.hsa),
    les_uploaded: Boolean(state.lesAutofill?.salary || state.lesAutofill?.tsp || state.lesAutofill?.fegli),

    target_retirement_age: num(goals.targetRetirementAge) || null,
    replacement_percent: num(goals.replacementPercent) || null,
    inflation: num(goals.inflation) || null,
    ss_plan: str(goals.ssPlan, 10),
    ss_start_age: String(goals.ssStartAge ?? ""),

    additional_savings: num(outside.additionalSavings),
    monthly_savings_outside: num(outside.monthlySavingsOutside),
    spouse_monthly_income: num(outside.spouseMonthlyIncome),
    prior_pension_monthly: num(outside.priorPensionMonthly),
    has_roth_ira: Boolean(outside.hasRothIRA),

    results: body.results ?? null,
    ai_narratives: body.aiNarratives ?? null,
  };

  try {
    const inserted = await supabaseRest<{ id: string }[]>("submissions", {
      method: "POST",
      body: row,
      returnRepresentation: true,
    });
    return NextResponse.json({ saved: true, id: inserted[0]?.id ?? null });
  } catch (e) {
    console.error("submission save failed:", e);
    return NextResponse.json({ saved: false, reason: "db-error" }, { status: 502 });
  }
}
