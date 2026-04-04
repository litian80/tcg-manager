import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/server";
import { processQueue } from "@/utils/queue";

// This endpoint should be triggered by a Vercel Cron Job every 1-2 minutes
export async function GET(request: Request) {
  // SECURITY: CRON_SECRET is MANDATORY. If not configured, fail-closed.
  // Without this check, anyone on the internet could trigger queue processing.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("CRON_SECRET is not configured — queue processing endpoint is disabled for safety.");
    return NextResponse.json(
      { error: "Endpoint not configured" },
      { status: 503 }
    );
  }

  if (request.headers.get("Authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createAdminClient();

  // Find all tournaments that have an active queue
  const { data: tournaments, error } = await supabase
    .from("tournaments")
    .select("id")
    .eq("enable_queue", true)
    .eq("queue_paused", false)
    .eq("registration_open", true);

  if (error) {
    console.error("Failed to fetch active queued tournaments:", error);
    return NextResponse.json({ error: "Failed to fetch tournaments" }, { status: 500 });
  }

  const results = [];
  for (const t of tournaments || []) {
    const res = await processQueue(t.id);
    results.push({ tournamentId: t.id, ...res });
  }

  return NextResponse.json({ success: true, processed: results });
}
