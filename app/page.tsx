import { getTournaments } from "@/actions/tournament/queries";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Calendar, Users, Trophy, ArrowRight } from "lucide-react";

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

  let tournaments: {
    id: string;
    name: string;
    total_rounds: number;
    status: string;
    date: string;
  }[] = [];
  let error;

  try {
    tournaments = await getTournaments();
  } catch (e: any) {
    error = { message: e.message || "Failed to load tournaments" };
  }

  const renderEmptyState = () => {
    if (userRole === 'admin' || userRole === 'organizer') {
      return (
        <div className="col-span-full text-center py-12 border rounded-lg border-dashed bg-muted/20">
          <Trophy className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="text-lg font-medium">No tournaments yet</h3>
          <p className="text-muted-foreground mt-1">Create your first tournament to get started.</p>
        </div>
      );
    }
    if (user) {
      return (
        <div className="col-span-full text-center py-12 border rounded-lg border-dashed bg-muted/20">
          <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="text-lg font-medium">No upcoming tournaments</h3>
          <p className="text-muted-foreground mt-1">Check back soon for new events in your area!</p>
        </div>
      );
    }
    return (
      <div className="col-span-full text-center py-12 border rounded-lg border-dashed bg-muted/20">
        <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <h3 className="text-lg font-medium">No upcoming tournaments</h3>
        <p className="text-muted-foreground mt-1">
          <Link href="/login" className="text-primary underline underline-offset-4 hover:text-primary/80">Sign in</Link> to register for events and submit your deck lists.
        </p>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex items-center justify-between border-b pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">TCG Manager</h1>
            <p className="text-muted-foreground">Tournament Management System</p>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {error && (
            <div className="col-span-full text-red-500">
              Error loading tournaments: {error.message}
            </div>
          )}

          {tournaments && tournaments.length > 0 ? (
            tournaments.map((tournament) => (
              <Link key={tournament.id} href={`/tournament/${tournament.id}`}>
                <Card className="h-full hover:border-primary transition-colors cursor-pointer group">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="line-clamp-2 text-xl group-hover:text-primary transition-colors">
                        {tournament.name}
                      </CardTitle>
                      <Badge variant={tournament.status === 'running' ? "default" : "secondary"} className={tournament.status === 'running' ? "bg-green-600 hover:bg-green-700" : ""}>
                        {tournament.status === 'running' ? "Live" : (tournament.status === 'completed' ? "Completed" : tournament.status)}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-2 pt-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(tournament.date).toLocaleDateString()}
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
            ))
          ) : (
            renderEmptyState()
          )}
        </div>
      </div>
    </main>
  );
}

