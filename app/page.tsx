import { getPublicTournaments, getOrganizerTournaments, getJudgeAssignedTournaments, getAdminTournamentsWithStats, PublicTournament } from "@/actions/tournament/queries";
import { createClient } from "@/utils/supabase/server";
import { formatDate, formatLocation, formatTimeShort, getTournamentStatusConfig, MODE_LABELS } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Users, Trophy, ArrowRight, ShieldAlert, Gavel, MapPin, Clock, ClipboardList, Swords, FileDown, RefreshCw, UserCheck, Radio } from "lucide-react";
import { Tournament } from "@/types";
import { ClientTime } from "@/components/client-time";

const STATUS_PRIORITY: Record<string, number> = { not_started: 0, running: 1, completed: 2 };

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
                      <ClientTime date={tournament.start_time} formatType="timeShort" fallback="--:--" />
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

  // Unauthenticated → landing page
  if (!user) {
    return <LandingPage />;
  }

  // Authenticated → existing role-based experience
  return (
    <main className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {userRole === 'admin' ? (
          <AdminView />
        ) : (
          <>
            {userRole === 'organizer' && <OrganizerStaffBanner />}
            {userRole !== 'admin' && <JudgeStaffBanner />}
            <AuthenticatedPlayerView playerPopId={playerPopId} />
          </>
        )}
      </div>
      
      <footer className="max-w-5xl mx-auto mt-16 pt-8 pb-4 border-t text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} BracketOps</p>
        <div className="mt-2 space-x-4">
           <Link href="/privacy" className="hover:underline hover:text-foreground transition-colors">Privacy Policy</Link>
        </div>
      </footer>
    </main>
  );
}

/* ============================================================================
   LANDING PAGE (unauthenticated visitors)
   ============================================================================ */

async function LandingPage() {
  const supabase = await createClient();

  // Fetch stats
  const [tournamentCount, playerCount, matchCount, upcomingRes] = await Promise.all([
    supabase.from('tournaments').select('*', { count: 'exact', head: true }).then(r => r.count ?? 0),
    supabase.from('tournament_players').select('*', { count: 'exact', head: true }).then(r => r.count ?? 0),
    supabase.from('matches').select('*', { count: 'exact', head: true }).then(r => r.count ?? 0),
    getPublicTournaments({ statusFilter: 'upcoming' }),
  ]);

  const upcomingTournaments: PublicTournament[] = ('success' in upcomingRes ? upcomingRes.success : []) ?? [];
  const previewTournaments = upcomingTournaments.slice(0, 3);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Hero ── */}
      <section className="border-b">
        <div className="max-w-3xl mx-auto px-6 py-20 md:py-28 text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]">
            Pokémon TCG Tournament Operations
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Create and manage events, register for tournaments, track live pairings — all from one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors text-base"
            >
              Sign In
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#tournaments"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 border rounded-lg font-medium hover:bg-accent transition-colors text-base"
            >
              Browse Tournaments
            </a>
          </div>
        </div>
      </section>

      {/* ── How It Works — Dual Path ── */}
      <section className="bg-muted/30 border-y">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Organiser path */}
            <div className="border rounded-xl p-8 bg-card space-y-6 landing-feature-card">
              <div className="flex items-center gap-3">
                <div className="bg-muted w-10 h-10 rounded-lg flex items-center justify-center">
                  <ClipboardList className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="text-xl font-semibold">For Organisers</h3>
              </div>
              <div className="space-y-4">
                {[
                  { step: "1", icon: ClipboardList, label: "Create event", desc: "Set up your tournament in BracketOps" },
                  { step: "2", icon: FileDown, label: "Download TDF", desc: "Export the file and load it into TOM" },
                  { step: "3", icon: RefreshCw, label: "Sync", desc: "Rounds and results sync back automatically" },
                ].map((s) => (
                  <div key={s.step} className="flex items-start gap-3">
                    <div className="landing-step-num bg-primary text-primary-foreground mt-0.5">
                      {s.step}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{s.label}</p>
                      <p className="text-muted-foreground text-sm">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2 pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:underline"
                >
                  Create your first event <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <div>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors"
                  >
                    <UserCheck className="h-3 w-3" />
                    Not an organiser yet? Sign in and apply from your Profile
                  </Link>
                </div>
              </div>
            </div>

            {/* Player path */}
            <div className="border rounded-xl p-8 bg-card space-y-6 landing-feature-card">
              <div className="flex items-center gap-3">
                <div className="bg-muted w-10 h-10 rounded-lg flex items-center justify-center">
                  <Swords className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="text-xl font-semibold">For Players</h3>
              </div>
              <div className="space-y-4">
                {[
                  { step: "1", label: "Browse events", desc: "Find tournaments near you" },
                  { step: "2", label: "Register & submit deck", desc: "Sign up and upload your list" },
                  { step: "3", label: "Play & track", desc: "Live pairings and standings on your phone" },
                ].map((s) => (
                  <div key={s.step} className="flex items-start gap-3">
                    <div className="landing-step-num bg-primary text-primary-foreground mt-0.5">
                      {s.step}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{s.label}</p>
                      <p className="text-muted-foreground text-sm">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <a
                href="#tournaments"
                className="inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:underline"
              >
                Find a tournament <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social Proof Stats ── */}
      {(tournamentCount > 0 || playerCount > 0) && (
        <section className="max-w-5xl mx-auto px-6 py-16">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16">
            {[
              { value: tournamentCount, label: "Tournaments hosted", icon: Trophy },
              { value: playerCount, label: "Registrations", icon: Users },
              { value: matchCount, label: "Matches played", icon: Swords },
            ].filter(s => s.value > 0).map((stat) => (
              <div key={stat.label} className="landing-stat text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <stat.icon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-3xl font-bold tabular-nums">{stat.value.toLocaleString()}</span>
                </div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Tournament Preview ── */}
      <section id="tournaments" className="bg-muted/30 border-y scroll-mt-16">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" /> Upcoming Tournaments
            </h2>
          </div>
          <PublicTournamentList
            tournaments={previewTournaments}
            emptyTitle="No upcoming tournaments"
            emptyDesc="Check back soon for new events in your area!"
            emptyIcon={Calendar}
          />
          {upcomingTournaments.length > 3 && (
            <div className="text-center mt-6">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                Sign in to see all {upcomingTournaments.length} events <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold tracking-tight mb-4">Ready to get started?</h2>
        <p className="text-muted-foreground mb-8">
          Free for players. Free for organisers.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 px-10 py-3.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors text-base"
        >
          Sign In
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="max-w-5xl mx-auto px-6 pt-8 pb-6 border-t text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} BracketOps</p>
        <div className="mt-2 space-x-4">
          <Link href="/privacy" className="hover:underline hover:text-foreground transition-colors">Privacy Policy</Link>
        </div>
      </footer>
    </div>
  );
}

/* ============================================================================
   AUTHENTICATED VIEWS (unchanged logic, extracted from old PlayerOrUnauthView)
   ============================================================================ */

async function AuthenticatedPlayerView({ playerPopId }: { playerPopId: string | null }) {
  const upcomingRes = await getPublicTournaments({ statusFilter: 'upcoming' });
  const allUpcoming: PublicTournament[] = ('success' in upcomingRes ? upcomingRes.success : []) ?? [];

  const registeredTournamentIds = new Set<string>();
  let myTournamentRecords: PublicTournament[] = [];

  if (playerPopId) {
    const supabase = await createClient();
    const { data: registrations } = await supabase
      .from('tournament_players')
      .select('tournament_id')
      .eq('player_id', playerPopId);
    
    if (registrations && registrations.length > 0) {
      registrations.forEach(r => registeredTournamentIds.add(r.tournament_id));

      const tournamentIds = registrations.map(r => r.tournament_id);
      const { data: myData } = await supabase
        .from('tournaments')
        .select('*, tournament_players(count)')
        .in('id', tournamentIds);

      if (myData) {
        myTournamentRecords = myData.map((row: any) => ({
          ...row,
          player_count: row.tournament_players?.[0]?.count ?? 0,
          tournament_players: undefined,
        }));
      }
    }
  }

  // 1. Live tournaments the player is participating in
  const liveTournaments = myTournamentRecords
    .filter(t => t.status === 'running')
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));

  // 2. Upcoming tournaments the player is registered for, date asc
  const registeredUpcoming = myTournamentRecords
    .filter(t => t.status === 'not_started' && (t.date ?? '') >= new Date().toISOString().split('T')[0])
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));

  // 3. Upcoming tournaments the player is NOT registered for, date asc
  const unregisteredUpcoming = allUpcoming
    .filter(t => !registeredTournamentIds.has(t.id))
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));

  // 4. Completed tournaments the player participated in, date desc
  const completedParticipated = myTournamentRecords
    .filter(t => t.status === 'completed' || (t.status !== 'running' && (t.date ?? '') < new Date().toISOString().split('T')[0]))
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

  return (
    <div className="space-y-12">
      {/* 1. Live */}
      {liveTournaments.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Radio className="h-6 w-6 text-green-600" /> Live Now
          </h2>
          <PublicTournamentList
            tournaments={liveTournaments}
            emptyTitle=""
            emptyDesc=""
            emptyIcon={Radio}
            registeredTournamentIds={registeredTournamentIds}
          />
        </section>
      )}

      {/* 2. Registered upcoming */}
      {registeredUpcoming.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" /> My Upcoming Tournaments
          </h2>
          <PublicTournamentList
            tournaments={registeredUpcoming}
            emptyTitle=""
            emptyDesc=""
            emptyIcon={Calendar}
            registeredTournamentIds={registeredTournamentIds}
          />
        </section>
      )}

      {/* 3. Upcoming — not registered */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Calendar className="h-6 w-6 text-muted-foreground" /> Upcoming Tournaments
        </h2>
        <PublicTournamentList
          tournaments={unregisteredUpcoming}
          emptyTitle="No upcoming tournaments"
          emptyDesc="Check back soon for new events in your area!"
          emptyIcon={Calendar}
          registeredTournamentIds={registeredTournamentIds}
        />
      </section>

      {/* 4. Completed — participated */}
      {completedParticipated.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-muted-foreground" /> Past Tournaments
          </h2>
          <PublicTournamentList
            tournaments={completedParticipated}
            emptyTitle=""
            emptyDesc=""
            emptyIcon={Trophy}
            registeredTournamentIds={registeredTournamentIds}
          />
        </section>
      )}
    </div>
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
