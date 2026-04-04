"use server";

import { createClient } from "@/utils/supabase/server";
import { dispatchWebhook } from "@/utils/webhooks";

/**
 * Send a test "ping" webhook to verify the organiser's notification endpoint.
 * Only callable by the tournament organizer or an admin.
 */
export async function testNotificationWebhook(tournamentId: string) {
  try {
    const supabase = await createClient();

    // 1. Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    // 2. Verify organizer/admin access
    const { data: profile } = await supabase
      .from("profiles")
      .select("pokemon_player_id, app_role")
      .eq("id", user.id)
      .single();

    const { data: tournament } = await supabase
      .from("tournaments")
      .select("name, organizer_popid, notification_webhook_url, notification_webhook_secret")
      .eq("id", tournamentId)
      .single();

    if (!tournament) return { error: "Tournament not found" };

    const isAdmin = profile?.app_role === "admin";
    const isOrganizer = profile?.pokemon_player_id === tournament.organizer_popid;
    if (!isAdmin && !isOrganizer) {
      return { error: "Unauthorized — only the organizer or an admin can test webhooks" };
    }

    // 3. Check webhook is configured
    if (!tournament.notification_webhook_url || !tournament.notification_webhook_secret) {
      return { error: "Webhook URL and secret must be configured before testing" };
    }

    // 4. Send ping event
    const result = await dispatchWebhook(
      tournament.notification_webhook_url,
      tournament.notification_webhook_secret,
      "ping",
      {
        tournament_id: tournamentId,
        tournament_name: tournament.name,
        test: true,
        message: "This is a test notification from BracketOps.",
      }
    );

    if (result.ok) {
      return { success: true, status: result.status };
    } else {
      return {
        error: result.error
          ? `Webhook failed: ${result.error}`
          : `Webhook returned HTTP ${result.status}`,
      };
    }
  } catch (error: any) {
    console.error("Test webhook error:", error);
    return { error: error.message || "An unexpected error occurred" };
  }
}
