import { getTournaments, getPublicTournaments, getOrganizerTournaments, getJudgeAssignedTournaments, getAdminTournamentsWithStats, PublicTournament } from "@/actions/tournament/queries";
import { createClient } from "@/utils/supabase/server";
import { formatDate, formatLocation, formatTimeShort, getTournamentStatusConfig, MODE_LABELS } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Users, Trophy, ArrowRight, ShieldAlert, AlertCircle, Gavel, MapPin, Clock } from "lucide-react";
import { Tournament } from "@/types";

const STATUS_PRIORITY: Record<string, number> = { not_started: 0, running: 1, completed: 2 };

function sortTournamentsByStatus(tournaments: Tournament[]): Tournament[] {
  return [...tournaments].sort((a, b) => {
    const pa = STATUS_PRIORITY[a.status] ?? 1;
    const pb = STATUS_PRIORITY[b.status] ?? 1;
    if (pa !== pb) return pa - pb;
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    // Upcoming: soonest first (ascending). Active/Completed: most recent first (descending).
    return a.status === 'not_started' ? dateA - dateB : dateB - dateA;
  });
}

function PublicTournamentList({ tournaments, emptyTitle, emptyDesc, emptyIcon: Icon, registeredTournamentIds, children }: { tournaments: PublicTournament[], emptyTitle: string, emptyDesc: React.ReactNode, emptyIcon: any, registeredTournamentIds?: Set<string>, children?: React.ReactNode }) {
  if (!tournaments || tournaments.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg border-dashed bg-muted/20">
        <Icon className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <h3 className="text-lg font-medium">{emptyTitle}</h3>
        <p className="text-muted-foreground mt-1">{emptyDesc}</p>
        {children}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {tournaments.map((tournament) => {
        const config = getTournamentStatusConfig(tournament.status);
        const location = formatLocation(tournament.city, tournament.country);
        const modeLabel = MODE_LABELS[tournament.tournament_mode] || tournament.tournament_mode;
        const isRegistered = registeredTournamentIds?.has(tournament.id);

        return (
          <Link key={tournament.id} href={`/tournament/${tournament.id}`} className="block group">
            <div className="flex items-start justify-between gap-4 px-4 py-3.5 rounded-lg border hover:bg-accent/50 hover:border-primary/30 transition-all">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium group-hover:text-primary transition-colors">{tournament.name}</span>
                  <Badge variant="outline" className="text-[10px] font-normal shrink-0">{modeLabel}</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    {formatDate(tournament.date)}
                  </span>
                  {tournament.start_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      {formatTimeShort(tournament.start_time)}
                    </span>
                  )}
                  {location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    {tournament.player_count} {tournament.player_count === 1 ? 'player' : 'players'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 pt-0.5">
                {isRegistered && (
                  <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 text-xs">
                    Registered
                  </Badge>
                )}
                <Badge variant={config.variant} className={`${config.className} text-xs`}>
                  {config.label}
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userRole: string | null = null;
  let playerPopId: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, pokemon_player_id')
      .eq('id', user.id)
      .single();
    userRole = profile?.role ?? null;
    playerPopId = profile?.pokemon_player_id ?? null;
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Admin gets exclusive system view */}
        {userRole === 'admin' ? (
          <AdminView />
        ) : (
          <>
            {/* Staff banners — shown contextually based on actual data */}
            {userRole === 'organizer' && <OrganizerStaffBanner />}
            {userRole !== 'admin' && <JudgeStaffBanner />}

            {/* All non-admin users see the public tournament hub */}
            <PlayerOrUnauthView isAuth={!!user} playerPopId={playerPopId} />
          </>
        )}

      </div>
      
      {/* Simple Footer with required Privacy Policy link for Google Verification */}
      <footer className="max-w-5xl mx-auto mt-16 pt-8 pb-4 border-t text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} BracketOps</p>
        <div className="mt-2 space-x-4">
           <Link href="/privacy" className="hover:underline hover:text-foreground transition-colors">Privacy Policy</Link>
        </div>
      </footer>
    </main>
  );
}

async function JudgeStaffBanner() {
  const res = await getJudgeAssignedTournaments();
  const tournaments: Tournament[] = ('success' in res ? res.success : undefined) ?? [];

  if (tournaments.length === 0) return null;

  const todayDateOnly = new Date().toISOString().split('T')[0];
  const upcomingCount = tournaments.filter(t => t.date >= todayDateOnly).length;

  return (
    <Link href="/judge" className="block">
      <Card className="border-primary/30 bg-primary/5 hover:border-primary transition-colors cursor-pointer group">
        <CardContent className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gavel className="h-5 w-5 text-primary" />
            <p className="text-sm font-medium">
              You have <span className="font-bold text-primary">{upcomingCount} upcoming</span> judge assignment{upcomingCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-1 text-sm text-primary font-medium">
            View Judge Dashboard
            <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

async function OrganizerStaffBanner() {
  const res = await getOrganizerTournaments();
  const tournaments: Tournament[] = ('success' in res ? res.success : undefined) ?? [];

  if (tournaments.length === 0) return null;

  return (
    <Link href="/organizer/tournaments" className="block">
      <Card className="border-primary/30 bg-primary/5 hover:border-primary transition-colors cursor-pointer group">
        <CardContent className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <p className="text-sm font-medium">
              You have <span className="font-bold text-primary">{tournaments.length}</span> tournament{tournaments.length !== 1 ? 's' : ''} to manage
            </p>
          </div>
          <div className="flex items-center gap-1 text-sm text-primary font-medium">
            Manage Tournaments
            <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

async function PlayerOrUnauthView({ isAuth, playerPopId }: { isAuth: boolean, playerPopId: string | null }) {
  const upcomingRes = await getPublicTournaments({ statusFilter: 'upcoming' });
  const pastRes = await getPublicTournaments({ statusFilter: 'past' });

  const upcomingTournaments: PublicTournament[] = ('success' in upcomingRes ? upcomingRes.success : []) ?? [];
  const pastTournaments: PublicTournament[] = ('success' in pastRes ? pastRes.success : []) ?? [];

  const registeredTournamentIds = new Set<string>();
  if (playerPopId) {
    const supabase = await createClient();
    const { data: registrations } = await supabase
      .from('tournament_players')
      .select('tournament_id')
      .eq('player_id', playerPopId);
    
    if (registrations) {
      registrations.forEach(r => registeredTournamentIds.add(r.tournament_id));
    }
  }

  return (
    <div className="space-y-12">
      {!isAuth && (
        <section className="bg-primary/5 border border-primary/20 rounded-lg p-6 flex flex-col items-center text-center space-y-4">
          <h2 className="text-2xl font-bold">Welcome to BracketOps</h2>
          <p className="text-muted-foreground max-w-lg">
            Find and register for tournaments, manage your rosters, and track your performance with stable precision.
          </p>
          <Link href="/login" className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors">
            Sign In to Register
          </Link>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" /> Upcoming Tournaments
        </h2>
        <PublicTournamentList 
          tournaments={upcomingTournaments} 
          emptyTitle="No upcoming tournaments" 
          emptyDesc="Check back soon for new events in your area!" 
          emptyIcon={Calendar} 
          registeredTournamentIds={registeredTournamentIds}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-muted-foreground" /> Past Tournaments
        </h2>
        <PublicTournamentList 
          tournaments={pastTournaments} 
          emptyTitle="No past tournaments" 
          emptyDesc="There are no completed public events yet." 
          emptyIcon={Trophy} 
          registeredTournamentIds={registeredTournamentIds}
        />
      </section>
    </div>
  );
}

async function AdminView() {
  const upcomingRes = await getAdminTournamentsWithStats({ statusFilter: 'upcoming' });
  const pastRes = await getAdminTournamentsWithStats({ statusFilter: 'past' });

  const upcomingTournaments: PublicTournament[] = ('success' in upcomingRes ? upcomingRes.success : []) ?? [];
  const pastTournaments: PublicTournament[] = ('success' in pastRes ? pastRes.success : []) ?? [];

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-destructive" /> Admin: All System Tournaments
        </h2>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" /> Upcoming Tournaments
        </h2>
        <PublicTournamentList 
          tournaments={upcomingTournaments} 
          emptyTitle="No upcoming tournaments" 
          emptyDesc="No future tournaments registered in the system." 
          emptyIcon={Calendar} 
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Trophy className="h-5 w-5 text-muted-foreground" /> Past Tournaments
        </h2>
        <PublicTournamentList 
          tournaments={pastTournaments} 
          emptyTitle="No past tournaments" 
          emptyDesc="No completed tournaments in the system yet." 
          emptyIcon={Trophy} 
        />
      </div>
    </div>
  );
}
