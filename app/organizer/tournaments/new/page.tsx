import { requireOrganizerOrAdmin } from "@/lib/auth";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CreateTournamentPageClient } from "./_components/create-tournament-page-client";
import { createClient } from "@/utils/supabase/server";
import { getDuplicateDefaults } from "@/actions/tournament/duplicate";
import type { TournamentFormDefaults } from "@/lib/tournament-templates";
import { getSystemDefaults } from "@/lib/tournament-templates";
import { Badge } from "@/components/ui/badge";

interface Props {
    searchParams: Promise<{ duplicate?: string }>;
}

export default async function NewTournamentPage({ searchParams }: Props) {
    const { profile } = await requireOrganizerOrAdmin();
    const params = await searchParams;
    const duplicateId = params?.duplicate;

    // Load saved templates from DB for this organiser
    const supabase = await createClient();
    const { data: savedTemplateRows } = await supabase
        .from('tournament_templates')
        .select('*')
        .eq('organizer_popid', profile.pokemon_player_id || '__none__');

    // Convert to a map: tournament_mode -> saved defaults
    const savedTemplates: Record<string, Partial<TournamentFormDefaults>> = {};
    if (savedTemplateRows) {
        for (const row of savedTemplateRows) {
            savedTemplates[row.tournament_mode] = {
                city: row.city || '',
                country: row.country || '',
                start_time: row.start_time_default || '13:00',
                requires_deck_list: row.requires_deck_list || false,
                deck_submission_cutoff_hours: row.deck_submission_cutoff_hours || 0,
                registration_open: row.registration_open ?? true,
                publish_roster: row.publish_roster ?? true,
                allow_online_match_reporting: row.allow_online_match_reporting || false,
                capacity: row.capacity || 0,
                capacity_juniors: row.capacity_juniors || 0,
                capacity_seniors: row.capacity_seniors || 0,
                capacity_masters: row.capacity_masters || 0,
                juniors_birth_year_max: row.juniors_birth_year_max || null,
                seniors_birth_year_max: row.seniors_birth_year_max || null,
                payment_required: row.payment_required || false,
                enable_queue: row.enable_queue || false,
            };
        }
    }

    // If duplicating, fetch the source tournament
    let duplicateDefaults: (TournamentFormDefaults & { name: string; date: string }) | null = null;
    if (duplicateId) {
        const result = await getDuplicateDefaults(duplicateId);
        if ('defaults' in result) {
            duplicateDefaults = result.defaults;
        }
    }

    return (
        <div className="container max-w-lg py-8 space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/organizer/tournaments" className="text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Create Tournament</h1>
                    <p className="text-muted-foreground">
                        {duplicateDefaults
                            ? "Duplicating from an existing tournament."
                            : "Choose a template or start from scratch."
                        }
                    </p>
                </div>
            </div>

            {duplicateDefaults && (
                <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-md">
                    <Badge variant="secondary">Duplicating</Badge>
                    <span className="text-sm font-medium">{duplicateDefaults.name}</span>
                </div>
            )}

            <CreateTournamentPageClient
                userRole={profile.role}
                userPopId={profile.pokemon_player_id || ""}
                savedTemplates={savedTemplates}
                duplicateDefaults={duplicateDefaults}
            />
        </div>
    );
}
