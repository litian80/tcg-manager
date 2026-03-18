"use server";

import { createClient } from "@/utils/supabase/server";
import { Role } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

export async function searchUsers(query: string) {
  const supabase = await createClient();

  // Basic search across multiple fields
  // In a real app, you might use a more advanced search or a RPC
  const { data: users, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, pokemon_player_id, role")
    .or(`email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%,pokemon_player_id.ilike.%${query}%`)
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
