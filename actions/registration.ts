"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { buildPaymentRedirectUrl } from "@/utils/payment";
import { tryDispatchNotification } from "@/utils/webhook-helpers";
import { createAdminClient } from "@/utils/supabase/server";

export type Division = "junior" | "senior" | "master";

// Helper to deduce division by birth year
export async function calculatePlayerDivision(
  birthYear: number,
  tournamentId: string
): Promise<Division> {
  const supabase = await createClient();
  const { data: tournament, error } = await supabase
    .from("tournaments")
    .select("juniors_birth_year_max, seniors_birth_year_max")
    .eq("id", tournamentId)
    .single();

  if (error || !tournament) throw new Error("Tournament not found");

  // Simplified logic: Juniors are >= jr threshold, Seniors are >= sr threshold, others are Masters.
  if (tournament.juniors_birth_year_max && birthYear >= tournament.juniors_birth_year_max) {
    return "junior";
  } else if (tournament.seniors_birth_year_max && birthYear >= tournament.seniors_birth_year_max) {
    return "senior";
  }

  return "master";
}

// Check if division is full (also checks overall tournament capacity)
export async function checkDivisionCapacity(
  tournamentId: string,
  division: Division
): Promise<{ available: boolean; currentCount: number; capacity: number; overallCount: number; overallCapacity: number }> {
  const supabase = await createClient();
  const capacityColumn = `capacity_${division}s` as "capacity_juniors" | "capacity_seniors" | "capacity_masters";

  // Fetch division count and overall count in parallel
  const [divCountRes, overallCountRes, tournamentRes] = await Promise.all([
    supabase
      .from("tournament_players")
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", tournamentId)
      .eq("division", division)
      .in("registration_status", ["registered", "checked_in"]),
    supabase
      .from("tournament_players")
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", tournamentId)
      .in("registration_status", ["registered", "checked_in"]),
    supabase
      .from("tournaments")
      .select(`capacity, ${capacityColumn}`)
      .eq("id", tournamentId)
      .single(),
  ]);

  if (tournamentRes.error) throw new Error("Failed to fetch tournament capacity");

  const capacity = (tournamentRes.data as any)[capacityColumn] || 0;
  const overallCapacity = (tournamentRes.data as any).capacity || 0;
  const currentCount = divCountRes.count || 0;
  const overallCount = overallCountRes.count || 0;

  // 0 = unlimited for either cap
  const divAvailable = capacity === 0 || currentCount < capacity;
  const overallAvailable = overallCapacity === 0 || overallCount < overallCapacity;
  const available = divAvailable && overallAvailable;

  return { available, currentCount, capacity, overallCount, overallCapacity };
}

export async function getWaitlistPosition(
  tournamentId: string,
  division: Division,
  playerId: string
): Promise<number | null> {
  const supabase = await createClient();

  // Get the player's registration record
  const { data: playerReg, error } = await supabase
    .from("tournament_players")
    .select("created_at")
    .eq("tournament_id", tournamentId)
    .eq("player_id", playerId)
    .eq("registration_status", "waitlisted")
    .maybeSingle();

  if (error || !playerReg || !playerReg.created_at) {
    return null;
  }

  // Count how many waitlisted players in the same division registered explicitly before this player
  const { count, error: countError } = await supabase
    .from("tournament_players")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .eq("division", division)
    .eq("registration_status", "waitlisted")
    .lt("created_at", playerReg.created_at);

  if (countError) {
    console.error("Error fetching waitlist position:", countError);
    return null;
  }

  // Position is count of people before them + 1
  return (count || 0) + 1;
}

export async function getQueuedPosition(
  tournamentId: string,
  playerId: string
): Promise<number | null> {
  const supabase = await createClient();

  const { data: playerReg, error } = await supabase
    .from("tournament_players")
    .select("created_at")
    .eq("tournament_id", tournamentId)
    .eq("player_id", playerId)
    .eq("registration_status", "queued")
    .maybeSingle();

  if (error || !playerReg || !playerReg.created_at) {
    return null;
  }

  const { count, error: countError } = await supabase
    .from("tournament_players")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .eq("registration_status", "queued")
    .lt("created_at", playerReg.created_at);

  if (countError) {
    return null;
  }

  return (count || 0) + 1;
}

export async function registerPlayer(tournamentId: string) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Please sign in to register for this tournament." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile?.first_name || !profile?.last_name || !profile?.pokemon_player_id || !profile?.birth_year) {
      return { error: "Profile incomplete. You must have a First Name, Last Name, Pokémon Player ID, and Birth Year to register." };
    }

    const { data: tournament } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", tournamentId)
      .single();

    if (!tournament) return { error: "Tournament not found." };

    if (!tournament.registration_open) {
      return { error: "Registration is not open for this tournament." };
    }

    if (tournament.status === 'cancelled') {
      return { error: "This tournament has been cancelled." };
    }

    if (tournament.registration_opens_at && new Date(tournament.registration_opens_at) > new Date()) {
      return { error: "Registration has not opened yet." };
    }

    if (tournament.registration_closes_at && new Date(tournament.registration_closes_at) < new Date()) {
      return { error: "Registration has closed." };
    }
    
    // Check if player is staff
    const { data: staffMatch } = await supabase
      .from("tournament_judges")
      .select("user_id")
      .eq("tournament_id", tournamentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (staffMatch || tournament.organizer_popid === profile.pokemon_player_id) {
        return { error: "Staff and Organizers cannot register as players in their own events." };
    }

    const division = await calculatePlayerDivision(profile.birth_year, tournamentId);

    const urlColumnMap = { junior: 'payment_url_juniors', senior: 'payment_url_seniors', master: 'payment_url_masters' } as const;
    const targetUrl = (tournament as any)[urlColumnMap[division]] as string | null;

    if (tournament.payment_required && !targetUrl) {
      return { error: `Payment URL is not configured for the ${division} division. Please contact the organizer.` };
    }

    const paymentRequired = !!(tournament.payment_required && targetUrl);

    // Generate payment callback token if needed
    const callbackToken = paymentRequired ? randomUUID() : null;

    let playerId: string | null = null;
    const { data: existingPlayer } = await supabase
      .from("players")
      .select("id")
      .eq("tom_player_id", profile.pokemon_player_id)
      .maybeSingle();

    if (existingPlayer) {
      playerId = existingPlayer.id;
      
      // Update the name just in case it changed
      await supabase
        .from("players")
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
        })
        .eq("id", playerId);
        
    } else {
      // Create new player record based on profile
      const { data: newPlayer, error: pError } = await supabase
        .from("players")
        .insert({
          tom_player_id: profile.pokemon_player_id,
          first_name: profile.first_name,
          last_name: profile.last_name,
        })
        .select()
        .single();

      if (pError) return { error: "Failed to create player profile." };
      playerId = newPlayer.id;
    }

    // SEC-005: Atomic registration via database RPC with deadlock retry
    const adminSupabase = await createAdminClient();
    const MAX_RETRIES = 3;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rpcResult: any = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const rpcResponse: any = await adminSupabase.rpc('register_player_atomic' as any, {
        p_tournament_id: tournamentId,
        p_player_id: profile.pokemon_player_id,
        p_division: division,
        p_payment_required: paymentRequired,
        p_callback_token: callbackToken,
        p_enable_queue: !!tournament.enable_queue,
      } as any);

      if (rpcResponse.error) {
        console.error("RPC registration error:", rpcResponse.error);
        return { error: "Failed to complete registration." };
      }

      rpcResult = rpcResponse.data;

      // If the RPC returned a deadlock hint, retry with backoff
      if (rpcResult?.error === 'DEADLOCK_RETRY' && attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 200 * Math.pow(2, attempt - 1)));
        continue;
      }

      break;
    }

    if (!rpcResult || rpcResult.error) {
      return { error: rpcResult?.error || "Failed to complete registration." };
    }

    const status: string = rpcResult.status;

    revalidatePath(`/tournaments/${tournamentId}`);

    // If queued, return queue context and skip payment redirect/webhooks
    if (status === "queued") {
      const position = await getQueuedPosition(tournamentId, profile.pokemon_player_id);
      return { success: true, status: 'queued', queuedPosition: position };
    }

    // Payment required: build redirect URL and return it
    if (status === "pending_payment" && paymentRequired && callbackToken) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const isStripe = tournament.payment_provider === 'stripe';
      
      const urlParams: Record<string, string> = {
        player_name: `${profile.first_name} ${profile.last_name}`,
        player_id: profile.pokemon_player_id,
        tournament_id: tournamentId,
        division,
        return_url: `${siteUrl}/tournament/${tournamentId}/payment-status?token=${callbackToken}`,
      };

      // Stripe uses client_reference_id (automatically included in webhook events)
      // Generic providers use callback_token in a custom webhook body
      if (isStripe) {
        urlParams.client_reference_id = callbackToken;
      } else {
        urlParams.callback_token = callbackToken;
      }

      const paymentUrl = buildPaymentRedirectUrl(targetUrl!, {
        ...urlParams,
        callback_token: callbackToken, // Always include for return_url matching
      });

      // Fire payment.pending webhook (await to ensure delivery on Vercel Edge)
      await tryDispatchNotification(adminSupabase, tournamentId, 'payment.pending', profile.pokemon_player_id, { division });

      return { success: true, status: 'pending_payment', paymentUrl };
    }
    
    // Fire registration webhook (await to ensure delivery on Vercel Edge)
    const webhookEvent = status === 'waitlisted' ? 'registration.waitlisted' : 'registration.confirmed';
    await tryDispatchNotification(adminSupabase, tournamentId, webhookEvent, profile.pokemon_player_id, { division });

    // If they got waitlisted, calculate what position they are
    if (status === "waitlisted") {
      const waitlistPosition = await getWaitlistPosition(tournamentId, division, profile.pokemon_player_id);
      return { success: true, status, waitlistPosition };
    }
    
    return { success: true, status };

  } catch (error: any) {
    console.error("Registration error:", error);
    return { error: error.message || "An unexpected error occurred." };
  }
}

export async function withdrawPlayer(tournamentId: string) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Please sign in to manage your registration." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("pokemon_player_id")
      .eq("id", user.id)
      .single();

    if (!profile?.pokemon_player_id) {
      return { error: "Profile missing POP ID." };
    }

    const { error: updateError } = await supabase
      .from("tournament_players")
      .update({
        registration_status: "withdrawn",
        payment_callback_token: null,
        payment_pending_since: null,
      })
      .eq("tournament_id", tournamentId)
      .eq("player_id", profile.pokemon_player_id);

    if (updateError) {
      return { error: "Failed to withdraw." };
    }

    // Fire registration.withdrawn webhook (await to ensure delivery on Vercel Edge)
    const adminSupabase = await createAdminClient();
    await tryDispatchNotification(adminSupabase, tournamentId, 'registration.withdrawn', profile.pokemon_player_id);

    revalidatePath(`/tournaments/${tournamentId}`);
    return { success: true };

  } catch (error: any) {
    return { error: error.message || "An unexpected error occurred." };
  }
}
