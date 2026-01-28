import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Printer } from "lucide-react";
import { TournamentSettingsForm } from "./_components/tournament-settings-form";
import { TdfExportCard } from "./_components/tdf-export-card";
import { RosterManager } from "./_components/roster-manager";
import { Role } from "@/lib/rbac";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AutoSyncUploader } from "./_components/auto-sync-uploader";
import { StaffManager } from "@/components/tournament/staff-manager";
import { ExportPenaltyCard } from "@/components/organizer/export-penalty-card";

export default async function OrganizerTournamentPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Fetch tournament details
    const { data: tournament, error } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !tournament) {
        notFound();
    }

    // Authorization check
    let isAuthorized = tournament.organizer_id === user.id;

    if (!isAuthorized) {
        const { data: profile } = await supabase.from('profiles').select('role, pokemon_player_id').eq('id', user.id).single();

        if (profile?.role === 'admin') {
            isAuthorized = true;
        } else if (tournament.organizer_popid && profile?.pokemon_player_id === tournament.organizer_popid) {
            isAuthorized = true;
        }
    }

    if (!isAuthorized) {
        redirect("/"); // unauthorized
    }

    // Check if tournament has matches (Active/Imported from TOM)
    const { count: matchesCount } = await supabase
        .from("matches")
        .select("*", { count: 'exact', head: true })
        .eq("tournament_id", id);

    const isActive = matchesCount !== null && matchesCount > 0;

    // Fetch Current Roster for RosterManager
    const { data: tpData } = await supabase
        .from('tournament_players')
        .select(`
            player_id,
            players:player_id (
                id,
                first_name,
                last_name,
                tom_player_id
            )
        `)
        .eq('tournament_id', id);

    const currentRoster = tpData?.map((tp: any) => ({
        ...tp.players,
        birth_year: tp.players.birth_year || null // Assuming players might have it? No, players table likely doesn't. 
        // We will just omit it for the list view if valid.
    })) || [];

    // Fetch Current Judges
    const { data: judgeLinks, error: judgeLinkError } = await supabase
        .from('tournament_judges')
        .select('user_id')
        .eq('tournament_id', id);

    console.log('--- DEBUG JUDGE FETCH ---');
    console.log('User ID:', user.id);
    console.log('Organizer ID (from tournament):', tournament.organizer_id);
    console.log('Organizer POP ID:', tournament.organizer_popid);
    if (judgeLinkError) console.error('Judge Link Error:', judgeLinkError);
    console.log('Judge Links Found:', judgeLinks?.length, judgeLinks);

    let judges: any[] = [];

    if (judgeLinks && judgeLinks.length > 0) {
        const judgeIds = judgeLinks.map(j => j.user_id);
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, first_name, last_name, nick_name, pokemon_player_id, role')
            .in('id', judgeIds);

        if (profileError) console.error('Profile Fetch Error:', profileError);
        console.log('Profiles Found:', profiles?.length, profiles);

        judges = profiles?.map(p => ({
            id: p.id,
            email: p.email,
            display_name: p.nick_name
                ? `${p.first_name} ${p.last_name} (${p.nick_name})`
                : `${p.first_name} ${p.last_name}`,
            role: p.role as Role,
            pokemon_player_id: p.pokemon_player_id
        })) || [];
    }

    return (
        <div className="container max-w-4xl py-8 space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href={`/tournament/${id}`} className="text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Manage Tournament</h1>
                        <p className="text-muted-foreground">{tournament.name}</p>
                    </div>
                </div>
                <Link
                    href={`/organizer/tournaments/${id}/flyer`}
                    target="_blank"
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 transition-colors"
                >
                    <Printer className="w-4 h-4" />
                    Print QR Poster
                </Link>
            </div>

            {isActive ? (
                <div className="space-y-6">
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Tournament Active</AlertTitle>
                        <AlertDescription>
                            This tournament has active matches or results imported from TOM.
                            Roster management, TDF generation, and settings are disabled.
                        </AlertDescription>
                    </Alert>

                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-6">
                            <div className="opacity-50 pointer-events-none grayscale">
                                <TournamentSettingsForm tournament={tournament} />
                            </div>
                            <AutoSyncUploader tournamentId={tournament.id} />
                            <div className="opacity-50 pointer-events-none grayscale">
                                <TdfExportCard tournament={tournament} />
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="opacity-50 pointer-events-none grayscale">
                                <RosterManager tournamentId={tournament.id} currentRoster={currentRoster} />
                            </div>
                            <StaffManager tournamentId={tournament.id} judges={judges} />
                            <ExportPenaltyCard tournamentId={tournament.id} />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-6">
                        <TournamentSettingsForm tournament={tournament} />

                        <div className="pointer-events-auto opacity-100 grayscale-0">
                            <AutoSyncUploader tournamentId={tournament.id} />
                        </div>
                        <TdfExportCard tournament={tournament} />
                    </div>
                    <div className="space-y-6">
                        <RosterManager tournamentId={tournament.id} currentRoster={currentRoster} />
                        <StaffManager tournamentId={tournament.id} judges={judges} />
                        <ExportPenaltyCard tournamentId={tournament.id} />
                    </div>
                </div>
            )}
        </div>
    );
}
