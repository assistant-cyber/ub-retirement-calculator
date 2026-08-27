import { NextResponse } from "next/server";
import { ADVISORS as STATIC_ADVISORS, type Advisor } from "@/lib/advisors";
import { supabaseConfigured, supabaseRest } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/advisors — advisor list for the Step-1 dropdown.
 * Reads the Supabase `advisors` table; falls back to the static list
 * in lib/advisors.ts if the DB is unreachable or not configured.
 */
export async function GET() {
  if (supabaseConfigured()) {
    try {
      const rows = await supabaseRest<Advisor[]>("advisors", {
        query: "select=name,email&active=eq.true&order=sort_order.asc",
      });
      if (Array.isArray(rows) && rows.length > 0) {
        return NextResponse.json({ advisors: rows, source: "db" });
      }
    } catch {
      // fall through to static list
    }
  }
  return NextResponse.json({ advisors: STATIC_ADVISORS, source: "static" });
}
