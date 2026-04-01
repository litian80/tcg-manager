import { getTournaments, getPublicTournaments, getOrganizerTournaments, getJudgeAssignedTournaments } from "@/actions/tournament/queries";
import { createClient } from "@/utils/supabase/server";
import { formatDate, getTournamentStatusConfig } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Calendar, Users, Trophy, ArrowRight, ShieldAlert, AlertCircle, Gavel } from "lucide-react";
import { Tournament } from "@/types";

function TournamentGrid({ tournaments, emptyTitle, emptyDesc, emptyIcon: Icon, children }: { tournaments: Tournament[], emptyTitle: string, emptyDesc: React.ReactNode, emptyIcon: any, children?: React.ReactNode }) {
  if (!tournaments || tournaments.length === 0) {
    return (
      <div className="col-span-full text-center py-12 border rounded-lg border-dashed bg-muted/20">
        <Icon className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <h3 className="text-lg font-medium">{emptyTitle}</h3>
        <p className="text-muted-foreground mt-1">{emptyDesc}</p>
        {children}
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {tournaments.map((tournament) => (
        <Link key={tournament.id} href={`/tournament/${tournament.id}`}>
          <Card className="h-full hover:border-primary transition-colors cursor-pointer group">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="line-clamp-2 text-xl group-hover:text-primary transition-colors">
                  {tournament.name}
                </CardTitle>
                {(() => {
                  const config = getTournamentStatusConfig(tournament.status)
                  return (
                    <Badge variant={config.variant} className={config.className}>
                      {config.label}
                    </Badge>
                  )
                })()}
              </div>
              <CardDescription className="flex items-center gap-2 pt-2">
                <Calendar className="h-4 w-4" />
                {formatDate(tournament.date)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Trophy className="h-4 w-4" />
                  <span>{tournament.total_rounds} Rounds</span>
                </div>
                <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userRole: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    userRole = profile?.role ?? null;
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
            <PlayerOrUnauthView isAuth={!!user} />
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

async function PlayerOrUnauthView({ isAuth }: { isAuth: boolean }) {
  const upcomingRes = await getPublicTournaments({ statusFilter: 'upcoming' });
  const pastRes = await getPublicTournaments({ statusFilter: 'past' });

  const upcomingTournaments = 'success' in upcomingRes ? upcomingRes.success : [];
  const pastTournaments = 'success' in pastRes ? pastRes.success : [];

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
        <TournamentGrid 
          tournaments={upcomingTournaments as any[]} 
          emptyTitle="No upcoming tournaments" 
          emptyDesc="Check back soon for new events in your area!" 
          emptyIcon={Calendar} 
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-muted-foreground" /> Past Tournaments
        </h2>
        <TournamentGrid 
          tournaments={pastTournaments as any[]} 
          emptyTitle="No past tournaments" 
          emptyDesc="There are no completed public events yet." 
          emptyIcon={Trophy} 
        />
      </section>
    </div>
  );
}

async function AdminView() {
  const res = await getTournaments();
  const tournaments = Array.isArray(res) ? res : ('success' in res ? res.success : []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-destructive" /> All System Tournaments
        </h2>
      </div>
      <TournamentGrid 
        tournaments={tournaments as any[]} 
        emptyTitle="No tournaments in system" 
        emptyDesc="The platform has no tournaments registered." 
        emptyIcon={Trophy} 
      />
    </div>
  );
}
