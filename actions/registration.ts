"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { buildPaymentRedirectUrl } from "@/utils/payment";

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

// Check if division is full
export async function checkDivisionCapacity(
  tournamentId: string,
  division: Division
): Promise<{ available: boolean; currentCount: number; capacity: number }> {
  const supabase = await createClient();
  const capacityColumn = `capacity_${division}s` as "capacity_juniors" | "capacity_seniors" | "capacity_masters";

  const { count, error: countError } = await supabase
    .from("tournament_players")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .eq("division", division)
    .in("registration_status", ["registered", "checked_in"]);

  const { data: tournament, error: tError } = await supabase
    .from("tournaments")
    .select(capacityColumn)
    .eq("id", tournamentId)
    .single();

  if (tError) throw new Error("Failed to fetch tournament capacity");

  const capacity = (tournament as any)[capacityColumn] || 0;
  const currentCount = count || 0;

  // 0 capacity implies unlimited
  const available = capacity === 0 || currentCount < capacity;

  return { available, currentCount, capacity };
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

export async function registerPlayer(tournamentId: string) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

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
    const capacityCheck = await checkDivisionCapacity(tournamentId, division);

    // Determine if payment is required
    const paymentRequired = tournament.payment_required && tournament.payment_url;
    const status = paymentRequired
      ? "pending_payment"
      : (capacityCheck.available ? "registered" : "waitlisted");

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
      
      // Update the name just in case it changed (e.g., they mistakenly imported under wrong name before)
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

    // Check if already registered
    const { data: existingReg } = await supabase
      .from("tournament_players")
      .select("registration_status")
      .eq("tournament_id", tournamentId)
      .eq("player_id", profile.pokemon_player_id)
      .maybeSingle();

    // Build the insert/update payload
    const registrationData: Record<string, unknown> = {
      registration_status: status,
      ...(paymentRequired ? {
        payment_callback_token: callbackToken,
        payment_pending_since: new Date().toISOString(),
      } : {}),
    };

    if (existingReg) {
        if (existingReg.registration_status !== 'withdrawn' && existingReg.registration_status !== 'cancelled') {
            return { error: "You are already registered or on the waitlist." };
        }
        
        // Update existing withdrawn/cancelled record to active
        const { error: updateError } = await supabase
            .from("tournament_players")
            .update(registrationData)
            .eq("tournament_id", tournamentId)
            .eq("player_id", profile.pokemon_player_id);
            
        if (updateError) return { error: "Failed to update registration status." };
    } else {
        // Create new registration record
        const { error: insertError } = await supabase
          .from("tournament_players")
          .insert({
            tournament_id: tournamentId,
            player_id: profile.pokemon_player_id,
            division: division,
            ...registrationData,
          });

        if (insertError) {
          console.error("Insert registration error:", insertError);
          return { error: "Failed to complete registration." };
        }
    }

    revalidatePath(`/tournaments/${tournamentId}`);

    // Payment required: build redirect URL and return it
    if (paymentRequired && callbackToken) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const paymentUrl = buildPaymentRedirectUrl(tournament.payment_url!, {
        player_name: `${profile.first_name} ${profile.last_name}`,
        player_id: profile.pokemon_player_id,
        tournament_id: tournamentId,
        division,
        callback_token: callbackToken,
        return_url: `${siteUrl}/tournament/${tournamentId}/payment-status?token=${callbackToken}`,
      });
      return { success: true, status: 'pending_payment', paymentUrl };
    }
    
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
    if (!user) return { error: "Not authenticated" };

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

    revalidatePath(`/tournaments/${tournamentId}`);
    return { success: true };

  } catch (error: any) {
    return { error: error.message || "An unexpected error occurred." };
  }
}
