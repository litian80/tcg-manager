import { createClient } from "@/utils/supabase/server";
import { authorizeTournamentManagement } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Printer, Ban } from "lucide-react";
import { TournamentSettingsForm } from "./_components/tournament-settings-form";
import { TdfExportCard } from "./_components/tdf-export-card";
import { RosterManager } from "./_components/roster-manager";
import { Role } from "@/lib/rbac";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AutoSyncUploader } from "./_components/auto-sync-uploader";
import { StaffManager } from "@/components/tournament/staff-manager";
import { ExportPenaltyCard } from "@/components/organizer/export-penalty-card";
import { TournamentPhaseIndicator } from "./_components/tournament-phase-indicator";
import { TournamentDashboardTabs } from "./_components/tournament-dashboard-tabs";
import { DashboardWidgets } from "./_components/dashboard-widgets";
import { AnnouncementManager } from "./_components/announcement-manager";
import { CancelTournamentButton } from "./_components/cancel-tournament-button";
import { DownloadOriginalTdfButton } from "./_components/download-original-tdf-button";
import { isVGCGameType, getListLabel } from "@/lib/utils";



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
    const isCancelled = tournament.status === 'cancelled';

    // Determine the default tab based on tournament state
    const defaultTab = isActive ? "during" : "pre";

    // FEAT-010: Determine game type for conditional queries
    const isVGC = isVGCGameType(tournament.game_type);
    const listLabel = getListLabel(tournament.game_type);

    // Fetch Current Roster and Deck/Team Lists for RosterManager
    const [rosterResult, deckListResult, teamListResult] = await Promise.all([
        supabase
            .from('tournament_players')
            .select(`
                player_id,
                registration_status,
                players:player_id (
                    id,
                    first_name,
                    last_name,
                    tom_player_id
                )
            `)
            .eq('tournament_id', id),
        // Fetch TCG deck lists (only for non-VGC)
        (tournament.requires_deck_list && !isVGC)
            ? supabase
                .from('deck_lists')
                .select('player_id, validation_status, raw_text')
                .eq('tournament_id', id)
            : Promise.resolve({ data: null, error: null }),
        // Fetch VGC team lists (only for VGC)
        (tournament.requires_deck_list && isVGC)
            ? supabase
                .from('vgc_team_lists')
                .select('player_id')
                .eq('tournament_id', id)
            : Promise.resolve({ data: null, error: null })
    ]);

    const rosterData = rosterResult.data;
    const deckStatusData = deckListResult.data;
    const teamStatusData = teamListResult.data;
    const deckStatusMap = new Map<string, string>();
    if (deckStatusData) {
        deckStatusData.forEach((item: any) => {
            deckStatusMap.set(item.player_id, item.raw_text === '[PAPER DECKLIST]' ? 'paper' : 'online');
        });
    }
    // FEAT-010: For VGC, all submitted team lists are 'online'
    if (teamStatusData) {
        teamStatusData.forEach((item: any) => {
            deckStatusMap.set(item.player_id, 'online');
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentRoster = (rosterData || []).map((tp: any) => ({
        ...tp.players,
        id: tp.player_id,
        birth_year: tp.players?.birth_year || null,
        registration_status: tp.registration_status,
        deck_list_status: deckStatusMap.has(tp.player_id)
            ? (deckStatusMap.get(tp.player_id) === 'paper' ? 'paper' as const : 'online' as const)
            : 'missing' as const
    }));

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

    const { data: announcementsData } = await supabase
        .from('tournament_announcements')
        .select('*')
        .eq('tournament_id', id)
        .order('created_at', { ascending: false });

    // UX-022: Compute dashboard widget stats from existing data
    const activeRoster = currentRoster.filter(
        (p: any) => p.registration_status === 'registered' || p.registration_status === 'checked_in'
    );
    const widgetStats = {
        registeredCount: activeRoster.length,
        capacity: tournament.capacity || 0,
        decksSubmitted: tournament.requires_deck_list
            ? currentRoster.filter((p: any) => p.deck_list_status !== 'missing' && (p.registration_status === 'registered' || p.registration_status === 'checked_in')).length
            : 0,
        decksRequired: tournament.requires_deck_list ? activeRoster.length : 0,
        pendingPayments: currentRoster.filter((p: any) => p.registration_status === 'pending_payment').length,
        paymentRequired: !!tournament.payment_required,
        startTime: tournament.start_time || null,
        deckDeadline: tournament.deck_list_submission_deadline || null,
    };

    return (
        <div className="container max-w-7xl py-8 space-y-6">
            {/* Header */}
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
                    {profile.role === 'admin' && (
                        <DownloadOriginalTdfButton tournamentId={tournament.id} />
                    )}
                    {!isCancelled && tournament.status !== 'completed' && (
                        <CancelTournamentButton tournamentId={tournament.id} tournamentName={tournament.name} />
                    )}
                    <Button asChild>
                        <Link
                            href={`/organizer/tournaments/${id}/flyer`}
                            target="_blank"
                        >
                            <Printer className="w-4 h-4" />
                            Print QR Poster
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Phase Indicator */}
            {!isCancelled && <TournamentPhaseIndicator isActive={isActive} />}

            {/* Cancelled Banner */}
            {isCancelled && (
                <Alert variant="destructive" className="border-red-600/50 bg-red-50 dark:bg-red-950/30">
                    <Ban className="h-4 w-4" />
                    <AlertTitle>Tournament Cancelled</AlertTitle>
                    <AlertDescription>
                        This tournament has been cancelled. All information is preserved in a read-only state. No further registrations or changes can be made.
                    </AlertDescription>
                </Alert>
            )}

            {/* Tabbed Dashboard */}
            <TournamentDashboardTabs defaultTab={defaultTab}>
                {{
                    pre: (
                        <div className="space-y-6">
                            {isActive && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Tournament Active</AlertTitle>
                                    <AlertDescription>
                                        This tournament has active matches. Configuration and Roster Management are disabled.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* UX-022: Dashboard Widgets */}
                            <DashboardWidgets {...widgetStats} listLabel={`${listLabel}s`} />

                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-6">
                                    <div className={(isActive || isCancelled) ? "opacity-50 pointer-events-none grayscale" : ""}>
                                        <TournamentSettingsForm tournament={tournament} isAdmin={profile.role === 'admin'} />
                                    </div>

                                    <div className={(isActive || isCancelled) ? "opacity-50 pointer-events-none grayscale" : ""}>
                                        <RosterManager tournamentId={tournament.id} currentRoster={currentRoster} requiresDeckList={!!tournament.requires_deck_list} listLabel={listLabel} />
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <StaffManager tournamentId={tournament.id} judges={judges} />
                                    <div className={(isActive || isCancelled) ? "opacity-50 pointer-events-none grayscale" : ""}>
                                        <TdfExportCard tournament={tournament} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ),
                    during: (
                        <div className="space-y-6">
                            <div className="max-w-2xl">
                                <AutoSyncUploader tournamentId={tournament.id} />
                            </div>
                        </div>
                    ),
                    announcements: (
                        <div className="space-y-6">
                            <AnnouncementManager 
                                tournamentId={tournament.id}
                                activeAnnouncementId={tournament.active_announcement_id}
                                preloadedAnnouncements={announcementsData || []} 
                            />
                        </div>
                    ),
                    post: (
                        <div className="space-y-6">
                            <div className="max-w-2xl">
                                <ExportPenaltyCard tournamentId={tournament.id} />
                            </div>
                        </div>
                    ),
                }}
            </TournamentDashboardTabs>
        </div>
    );
}
