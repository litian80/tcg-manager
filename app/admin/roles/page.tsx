import { createClient } from "@/utils/supabase/server";
import { UserRoleTable } from "@/components/admin/UserRoleTable";
import { redirect } from "next/navigation";
import { Role } from "@/lib/rbac";

export default async function AdminRolesPage() {
  const supabase = await createClient();

  // Double check admin role on server side
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  // Fetch initial list (e.g., recent or first few users)
  const { data: initialUsers } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, pokemon_player_id, role")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="container py-10 space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
        <p className="text-muted-foreground">
          Promote or demote users to manage application permissions.
        </p>
      </div>

      <UserRoleTable initialUsers={(initialUsers || []) as any} />
    </div>
  );
}
