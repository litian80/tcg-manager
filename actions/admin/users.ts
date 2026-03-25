"use server";

import { createClient } from "@/utils/supabase/server";
import { Role } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { sanitizeSearchQuery } from "@/lib/utils";
import { safeAction, type ActionResult } from "@/lib/safe-action";

export async function searchUsers(query: string) {
  return safeAction(async () => {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (adminProfile?.role !== "admin") {
      return { error: "Only admins can search users for role management" };
    }

    const { data: users, error } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name, pokemon_player_id, role")
      .or(`email.ilike.%${sanitizeSearchQuery(query)}%,first_name.ilike.%${sanitizeSearchQuery(query)}%,last_name.ilike.%${sanitizeSearchQuery(query)}%,pokemon_player_id.ilike.%${sanitizeSearchQuery(query)}%`)
      .limit(20);

    if (error) {
      console.error("Error searching users:", error);
      return { error: "Failed to search users" };
    }

    return { success: users };
  });
}

export async function updateUserRole(targetUserId: string, newRole: Role): Promise<ActionResult> {
  return safeAction(async () => {
    const supabase = await createClient();

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return { error: "Unauthorized" };

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .single();

    if (adminProfile?.role !== "admin") {
      return { error: "Only admins can manage roles" };
    }

    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", targetUserId);

    if (error) {
      console.error("Error updating user role:", error);
      return { error: "Failed to update user role" };
    }

    revalidatePath("/admin/users");
    return { success: true };
  });
}
