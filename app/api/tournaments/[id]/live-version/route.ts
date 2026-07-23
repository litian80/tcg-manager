import { NextResponse } from "next/server";
import { getAnonSupabase } from "@/lib/supabase-anon";
import { computeLiveVersion } from "@/lib/live-version";

export const runtime = "edge";

/**
 * Tiny live-state fingerprint for spectators (anonymous / non-participant
 * viewers) who don't hold a Realtime subscription. Returns { v } — a short
 * token that changes when results/rounds change. The response is CDN-cached
 * (Cache-Control in vercel.json, s-maxage=8), so N spectators polling collapse
 * to ~one shared DB read per window regardless of audience size.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getAnonSupabase();

  const { data, error } = await supabase
    .from("matches")
    .select("is_finished, round_number, outcome")
    .eq("tournament_id", id);

  if (error) {
    // Stable token on error so clients don't refresh spuriously.
    return NextResponse.json({ v: "err" });
  }

  return NextResponse.json({ v: computeLiveVersion(data ?? []) });
}
