import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tournamentId = searchParams.get("t");
  const playerId = searchParams.get("p");

  if (!tournamentId || !playerId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  // SECURITY: Use the authenticated client so RLS limits visibility to the requesting user's own data.
  // The previous implementation used createAdminClient() which bypassed RLS, exposing
  // registration status and payment tokens to any unauthenticated caller.
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify the requesting user owns the player ID they're querying.
  // This prevents authenticated users from enumerating other players' statuses.
  const { data: profile } = await supabase
    .from("profiles")
    .select("pokemon_player_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.pokemon_player_id !== playerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: registration, error: regError } = await supabase
    .from("tournament_players")
    .select("registration_status, created_at, queue_promoted_at")
    .eq("tournament_id", tournamentId)
    .eq("player_id", playerId)
    .maybeSingle();

  if (regError || !registration) {
    return NextResponse.json({ status: "not_found" });
  }

  let position = null;
  if (registration.registration_status === "queued") {
    const { count } = await supabase
      .from("tournament_players")
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", tournamentId)
      .eq("registration_status", "queued")
      .lt("created_at", registration.created_at || new Date().toISOString());
    
    position = (count || 0) + 1;
  }

  // SECURITY: Never expose payment_callback_token in API responses.
  // The token is an internal secret between BracketOps and the payment provider.
  // The client only needs status + queue position to render the UI.
  return NextResponse.json(
    { 
      status: registration.registration_status, 
      position,
      // Indicate whether payment is expected (boolean), never leak the actual token
      paymentPending: registration.registration_status === "pending_payment",
    },
    {
      headers: {
        "Cache-Control": "s-maxage=2, stale-while-revalidate",
      },
    }
  );
}
