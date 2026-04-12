"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Cancel a tournament. Sets status to 'cancelled' and closes registration.
 * Only admins and the tournament organiser (by POP ID match) can cancel.
 * Cannot cancel tournaments that are already completed or cancelled.
 */
export async function cancelTournament(tournamentId: string) {
  const supabase = await createClient();

  // 1. Authenticate
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, pokemon_player_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Profile not found." };

  // 2. Fetch tournament (admin client to bypass RLS)
  const adminSupabase = await createAdminClient();
  const { data: tournament, error: fetchError } = await adminSupabase
    .from("tournaments")
    .select("id, status, organizer_popid")
    .eq("id", tournamentId)
    .single();

  if (fetchError || !tournament) return { error: "Tournament not found." };

  // 3. Authorise: admin role OR organiser POP ID match
  const isAdmin = profile.role === "admin";
  const isOrganiser =
    tournament.organizer_popid &&
    profile.pokemon_player_id === tournament.organizer_popid;

  if (!isAdmin && !isOrganiser) {
    return { error: "You do not have permission to cancel this tournament." };
  }

  // 4. Validate: cannot cancel if already completed or cancelled
  if (tournament.status === "cancelled") {
    return { error: "This tournament is already cancelled." };
  }
  if (tournament.status === "completed") {
    return { error: "Cannot cancel a completed tournament." };
  }

  // 5. Update: set status to cancelled and close registration
  const { error: updateError } = await adminSupabase
    .from("tournaments")
    .update({
      status: "cancelled",
      registration_open: false,
    })
    .eq("id", tournamentId);

  if (updateError) {
    return { error: `Failed to cancel tournament: ${updateError.message}` };
  }

  revalidatePath(`/tournament/${tournamentId}`);
  revalidatePath(`/organizer/tournaments/${tournamentId}`);
  revalidatePath(`/organizer/tournaments`);
  revalidatePath("/");

  return { success: true };
}
