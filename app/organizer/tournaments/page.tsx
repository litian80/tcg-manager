import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function OrganizerTournamentsListPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Check role, but we also just show tournaments where user is organizer
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin' && profile?.role !== 'organizer') {
        return (
            <div className="container py-8">
                <h1 className="text-2xl font-bold">Unauthorized</h1>
                <p>You do not have permission to view this page.</p>
            </div>
        );
    }

    // Fetch tournaments where organizer_id is current user
    // OR where organizer_popid matches user's pop id (legacy/migration support)
    // For now we rely on organizer_id which is the robust link.

    let query = supabase
        .from("tournaments")
        .select("*")
        .order("date", { ascending: false });

    if (profile.role !== 'admin') {
        // If not admin, restrict to own tournaments via POP ID
        if (profile.pokemon_player_id) {
            query = query.eq('organizer_popid', profile.pokemon_player_id);
        } else {
            // Use a dummy ID ensuring no results are returned if user has no POP ID
            query = query.eq('organizer_popid', 'NO_POP_ID_ASSIGNED');
        }
    }

    const { data: tournaments, error } = await query;

    return (
        <div className="container max-w-4xl py-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">My Tournaments</h1>
                    <p className="text-muted-foreground">Manage your organized events and export TDF files.</p>
                </div>
                <Link href="/organizer/tournaments/new">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Create TOM File
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
                    <Card key={tournament.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg">{tournament.name}</h3>
                                <Badge variant={tournament.status === 'completed' ? 'secondary' : 'default'}>
                                    {tournament.status}
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {new Date(tournament.date).toLocaleDateString()} • {tournament.city || 'No Location'}
                            </p>
                            {tournament.tom_uid ? (
                                <p className="text-xs text-green-600 flex items-center gap-1">
                                    ✓ Sanction ID: {tournament.tom_uid}
                                </p>
                            ) : (
                                <p className="text-xs text-amber-500 flex items-center gap-1">
                                    ⚠ Missing Sanction ID
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Link href={`/tournament/${tournament.id}`}>
                                <Button variant="outline" size="sm">View Public</Button>
                            </Link>
                            {/* Manage Button removed as per request - access via Public Page */}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
