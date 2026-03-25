import { requireJudgeOrAdmin } from "@/lib/auth";
import { getJudgeAssignedTournaments } from "@/actions/tournament/queries";
import { formatDate, getTournamentStatusConfig } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Calendar, Trophy, ArrowRight, Gavel } from "lucide-react";
import { Tournament } from "@/types";

export default async function JudgeDashboardPage() {
    await requireJudgeOrAdmin();

    const res = await getJudgeAssignedTournaments();
    const tournaments: Tournament[] = ('success' in res ? res.success : undefined) ?? [];

    // Split into upcoming and past
    const todayDateOnly = new Date().toISOString().split('T')[0];
    const upcomingEvents = tournaments.filter(t => t.date >= todayDateOnly);
    const pastEvents = tournaments.filter(t => t.date < todayDateOnly);

    return (
        <div className="container max-w-4xl py-8 space-y-10">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <Gavel className="h-6 w-6 text-primary" />
                    Judge Dashboard
                </h1>
                <p className="text-muted-foreground">Your assigned tournament events</p>
            </div>

            {/* Upcoming Events */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" /> Upcoming Assignments
                </h2>
                {upcomingEvents.length === 0 ? (
                    <div className="text-center py-12 border rounded-lg border-dashed bg-muted/20">
                        <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                        <h3 className="text-lg font-medium">No upcoming assignments</h3>
                        <p className="text-muted-foreground mt-1">You have not been assigned to judge any upcoming tournaments.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {upcomingEvents.map((tournament) => (
                            <EventCard key={tournament.id} tournament={tournament} />
                        ))}
                    </div>
                )}
            </section>

            {/* Past Events */}
            {pastEvents.length > 0 && (
                <section className="space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-muted-foreground" /> Past Assignments
                    </h2>
                    <div className="grid gap-4">
                        {pastEvents.map((tournament) => (
                            <EventCard key={tournament.id} tournament={tournament} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

function EventCard({ tournament }: { tournament: Tournament }) {
    const config = getTournamentStatusConfig(tournament.status);

    return (
        <Link href={`/tournament/${tournament.id}`}>
            <Card className="hover:border-primary transition-colors cursor-pointer group">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">
                            {tournament.name}
                        </CardTitle>
                        <Badge variant={config.variant} className={config.className}>
                            {config.label}
                        </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-2 pt-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(tournament.date)}
                        {tournament.city && <span>• {tournament.city}</span>}
                    </CardDescription>
                </CardHeader>
                <CardContent>
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
    );
}
