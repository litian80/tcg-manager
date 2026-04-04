import { createAdminClient } from "@/utils/supabase/server";
import { tryDispatchNotification } from "@/utils/webhook-helpers";

export async function processQueue(tournamentId: string) {
  const supabase = await createAdminClient();
  
  const { data: results, error } = await supabase
    .rpc("process_tournament_queue", { p_tournament_id: tournamentId });
    
  if (error) {
    console.error("Failed to process tournament queue:", error);
    return { success: false, error: error.message };
  }
  
  if (results && results.length > 0) {
    // The RPC returns { player_id, division, new_status } for each promoted player
    for (const res of results) {
       if (res.new_status === 'pending_payment') {
         tryDispatchNotification(supabase, tournamentId, 'payment.pending', res.player_id, { division: res.division }).catch(() => {});
       } else if (res.new_status === 'registered') {
         tryDispatchNotification(supabase, tournamentId, 'registration.confirmed', res.player_id, { division: res.division }).catch(() => {});
       }
    }
  }
  
  return { success: true, processedCount: results?.length || 0 };
}
