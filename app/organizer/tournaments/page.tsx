import { createClient } from "@/utils/supabase/server";
import { requireOrganizerOrAdmin } from "@/lib/auth";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TournamentList } from "./_components/tournament-list";

export default async function OrganizerTournamentsListPage() {
    const { user, profile } = await requireOrganizerOrAdmin();

    const supabase = await createClient();

    let query = supabase
        .from("tournaments")
        .select("*")
        .order("date", { ascending: false });

    if (profile.role !== 'admin') {
        if (profile.pokemon_player_id) {
            query = query.eq('organizer_popid', profile.pokemon_player_id);
        } else {
            query = query.eq('organizer_id', user.id);
        }
    }

    const { data: tournaments, error } = await query;

    if (error) {
        console.error("Failed to load tournaments:", error);
    }

    return (
        <div className="container max-w-4xl py-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Tournament Management</h1>
                    <p className="text-muted-foreground">Manage your tournaments and export TDF files</p>
                </div>
                <Link href="/organizer/tournaments/new">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Tournament
                    </Button>
                </Link>
            </div>

            <TournamentList tournaments={tournaments || []} />
        </div>
    );
}
