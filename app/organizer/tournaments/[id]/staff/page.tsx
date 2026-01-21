import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import { Role } from "@/lib/rbac";
import { StaffManager } from "@/components/tournament/staff-manager";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function OrganizerStaffPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Fetch Tournament
    const { data: tournamentData, error: tournamentError } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", id)
        .single();

    if (tournamentError || !tournamentData) {
        notFound();
    }

    const tournament = tournamentData;

    // 2. Check Permissions
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, pokemon_player_id')
        .eq('id', user.id)
        .single();

    const userRole = profile?.role as Role;
    const isOrganizer = userRole !== 'admin' && tournament.organizer_popid &&
        (profile?.pokemon_player_id === tournament.organizer_popid);

    const canManageStaff = userRole === 'admin' || isOrganizer;

    if (!canManageStaff) {
        redirect(`/tournament/${id}`); // Redirect back to public page if not authorized
    }

    // 3. Fetch Judges
    // Need to select valid columns: first_name, last_name, nick_name, pokemon_player_id (display_name & avatar_url do not exist)
    const { data: judgesData, error: judgesError } = await supabase
        .from("tournament_judges")
        .select(`
            user:profiles(id, email, first_name, last_name, nick_name, pokemon_player_id, role)
        `)
        .eq("tournament_id", id);

    if (judgesError) {
        console.error("Error fetching judges:", judgesError);
    }

    const judges = judgesData ? judgesData.map((j: any) => {
        // Synthesize display_name
        const displayName = j.user.nick_name
            ? `${j.user.first_name} ${j.user.last_name} (${j.user.nick_name})`
            : `${j.user.first_name} ${j.user.last_name}`;

        return {
            id: j.user.id,
            email: j.user.email,
            display_name: displayName,
            avatar_url: null, // Schema does not have avatar_url
            pokemon_player_id: j.user.pokemon_player_id,
            role: j.user.profile?.role || j.user.role // Handle potential nesting differences or direct access
        };
    }) : [];

    return (
        <div className="container max-w-2xl mx-auto py-8 px-4">
            <div className="mb-6">
                <Link href={`/tournament/${id}`} className="text-muted-foreground hover:text-foreground flex items-center gap-2 mb-4">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Tournament
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{tournament.name}</h1>
                        <h2 className="text-xl text-muted-foreground">Staff Management</h2>
                    </div>
                </div>
                <p className="text-muted-foreground mt-2">Manage authorized judges for this event.</p>
            </div>

            <StaffManager tournamentId={id} judges={judges} />
        </div>
    );
}
