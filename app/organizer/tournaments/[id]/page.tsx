import { createClient } from "@/utils/supabase/server";
import { authorizeTournamentManagement } from "@/lib/auth";
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

    let authResult;
    try {
        authResult = await authorizeTournamentManagement(id);
    } catch (error) {
        if (error instanceof Error && error.message === 'Tournament not found') {
            notFound();
        }
        throw error; // handleAuthError already called inside authorizeTournamentManagement
    }

    if (!authResult || !authResult.isAuthorized) {
        redirect("/?error=unauthorized");
    }

    const { tournament, user, profile } = authResult;
    const supabase = await createClient();

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentRoster = tpData?.map((tp: any) => ({
        ...tp.players,
        birth_year: tp.players.birth_year || null
    })) || [];

    // Fetch Current Judges
    const { data: judgeLinks } = await supabase
        .from('tournament_judges')
        .select('user_id')
        .eq('tournament_id', id);

    let judges: any[] = [];

    if (judgeLinks && judgeLinks.length > 0) {
        const judgeIds = judgeLinks.map(j => j.user_id);
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, email, first_name, last_name, nick_name, pokemon_player_id, role')
            .in('id', judgeIds);

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
        <div className="container max-w-7xl py-8 space-y-8">
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
                <div className="flex items-center gap-2">
                    <Link
                        href={`/organizer/tournaments/${id}/flyer`}
                        target="_blank"
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 transition-colors"
                    >
                        <Printer className="w-4 h-4" />
                        Print QR Poster
                    </Link>
                </div>
            </div>

            {isActive && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Tournament Active</AlertTitle>
                    <AlertDescription>
                        This tournament has active matches. Configuration and Roster Management are disabled.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
                {/* Left Column: Configuration, Roster, TDF Export */}
                <div className="space-y-6">
                    <div className={isActive ? "opacity-50 pointer-events-none grayscale" : ""}>
                        <TournamentSettingsForm tournament={tournament} />
                    </div>

                    <div className={isActive ? "opacity-50 pointer-events-none grayscale" : ""}>
                        <RosterManager tournamentId={tournament.id} currentRoster={currentRoster} />
                    </div>

                    <div className={isActive ? "opacity-50 pointer-events-none grayscale" : ""}>
                        <TdfExportCard tournament={tournament} />
                    </div>
                </div>

                {/* Right Column: Auto-Sync, Staff, Penalties */}
                <div className="space-y-6">
                    <AutoSyncUploader tournamentId={tournament.id} />
                    <StaffManager tournamentId={tournament.id} judges={judges} />
                    <ExportPenaltyCard tournamentId={tournament.id} />
                </div>
            </div>
        </div>
    );
}
