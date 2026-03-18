import { createClient } from "@/utils/supabase/server";
import { requireOrganizerOrAdmin } from "@/lib/auth";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function OrganizerTournamentsListPage() {
    // Page-level auth - will redirect if not organizer/admin
    const { user, profile } = await requireOrganizerOrAdmin();

    const supabase = await createClient();

    // Query tournaments based on role
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

            <div className="grid gap-4">
                {error && <div className="text-red-500">Failed to load tournaments.</div>}
                
                {tournaments && tournaments.length === 0 && (
                    <div className="text-center py-12 border rounded-lg bg-muted/50">
                        <p className="text-muted-foreground">No tournaments found.</p>
                    </div>
                )}

                {tournaments?.map((tournament) => (
                    <Card key={tournament.id} className="hover:bg-accent/50 transition-colors">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">{tournament.name}</CardTitle>
                                <Badge variant={tournament.status === "completed" ? "secondary" : "default"}>
                                    {tournament.status}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm">
                                        {new Date(tournament.date).toLocaleDateString()} • {tournament.city || "No location"}
                                    </p>
                                    {tournament.tom_uid && (
                                        <p className="text-xs text-green-600">
                                            Sanction ID: {tournament.tom_uid}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link href={`/tournament/${tournament.id}`}>
                                        <Button variant="outline" size="sm">View Public</Button>
                                    </Link>
                                    <Link href={`/organizer/tournaments/${tournament.id}`}>
                                        <Button size="sm">Manage</Button>
                                    </Link>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
