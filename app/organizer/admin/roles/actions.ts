"use server";

import { createClient } from "@/utils/supabase/server";
import { Role } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { sanitizeSearchQuery } from "@/lib/utils";

export async function searchUsers(query: string) {
  const supabase = await createClient();

  // Auth Check: only admins can search users for role management
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (adminProfile?.role !== "admin") {
    throw new Error("Only admins can search users for role management");
  }

  // Basic search across multiple fields
  const { data: users, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, pokemon_player_id, role")
    .or(`email.ilike.%${sanitizeSearchQuery(query)}%,first_name.ilike.%${sanitizeSearchQuery(query)}%,last_name.ilike.%${sanitizeSearchQuery(query)}%,pokemon_player_id.ilike.%${sanitizeSearchQuery(query)}%`)
    .limit(20);

  if (error) {
    console.error("Error searching users:", error);
    throw new Error("Failed to search users");
  }

  return users;
}

export async function updateUserRole(targetUserId: string, newRole: Role) {
  const supabase = await createClient();

  // 1. Verify caller is an admin
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) throw new Error("Unauthorized");

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", currentUser.id)
    .single();

  if (adminProfile?.role !== "admin") {
    throw new Error("Only admins can manage roles");
  }

  // 2. Perform update
  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", targetUserId);

  if (error) {
    console.error("Error updating user role:", error);
    throw new Error("Failed to update user role");
  }

  // 3. Revalidate path to ensure UI updates
  revalidatePath("/organizer/admin/roles");
}
