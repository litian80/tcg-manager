"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, UserPlus, Trash2, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { searchRosterCandidates, addPlayerToRoster, removePlayerFromRoster, RosterCandidate } from "@/actions/roster-management";
import { useRouter } from "next/navigation";
import { OrganizerDeckModal } from "@/components/organizer/OrganizerDeckModal";

interface Player {
    id: string; // The UUID in `players` table (or tom_player_id if used as ID? No, UUID likely)
    first_name: string;
    last_name: string;
    tom_player_id?: string;
    birth_year?: number;
    has_deck_list?: boolean; // deprecated, kept for compat
    deck_list_status?: 'online' | 'paper' | 'missing';
}

interface RosterManagerProps {
    tournamentId: string;
    currentRoster: Player[];
    requiresDeckList?: boolean;
    listLabel?: string;
}

export function RosterManager({ tournamentId, currentRoster, requiresDeckList, listLabel = 'deck' }: RosterManagerProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<RosterCandidate[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [addingId, setAddingId] = useState<string | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [selectedPlayer, setSelectedPlayer] = useState<{ id: string; name: string } | null>(null);
    const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);
    const router = useRouter();

    // Simple search handler
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (query.length < 2) return;

        setIsSearching(true);
        try {
            const candidates = await searchRosterCandidates(query);
            // Filter out already added players based on maybe First+Last+PID match?
            // Actually `candidates` have profile info. `currentRoster` has player info.
            // Best filter is logic: Check if candidates' POP ID is in currentRoster.
            const existingPids = new Set(currentRoster.map(p => p.tom_player_id));

            const filtered = candidates.filter(c => !existingPids.has(c.pokemon_player_id));

            setResults(filtered);
            if (filtered.length === 0) {
                if (candidates.length > 0) {
                    toast.info("Found users, but they are already in the roster.");
                } else {
                    toast.info("No eligible profiles found.");
                }
            }
        } catch (err) {
            toast.error("Search failed.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleAdd = async (candidate: RosterCandidate) => {
        setAddingId(candidate.id);
        try {
            const result = await addPlayerToRoster(tournamentId, candidate.id);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(`Added ${candidate.first_name} to roster.`);
                setResults(prev => prev.filter(p => p.id !== candidate.id));
                router.refresh(); // Refresh to show new roster
            }
        } catch (error: any) {
            toast.error("Unexpected error adding player.");
        } finally {
            setAddingId(null);
        }
    };

    const handleRemove = async (player: Player) => {
        if (!confirm(`Remove ${player.first_name} ${player.last_name} from roster?`)) return;

        if (!player.tom_player_id) {
            toast.error("Cannot remove player: Missing POP ID.");
            return;
        }

        setRemovingId(player.id);
        try {
            const result = await removePlayerFromRoster(tournamentId, player.tom_player_id);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(`Removed ${player.first_name}.`);
                router.refresh();
            }
        } catch (error: any) {
            toast.error("Unexpected error removing player.");
        } finally {
            setRemovingId(null);
        }
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Roster Management</CardTitle>
                <CardDescription>
                    Manage players for this tournament.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-6">
                {/* Search Section */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold">Add New Player</h3>
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <Input
                            placeholder="Search name or ID..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        <Button type="submit" disabled={isSearching || query.length < 2}>
                            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                    </form>

                    {results.length > 0 && (
                        <div className="border rounded-md p-2 space-y-1 max-h-[200px] overflow-y-auto bg-muted/20">
                            {results.map((candidate) => (
                                <div key={candidate.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50 text-sm">
                                    <div>
                                        <p className="font-medium">{candidate.first_name} {candidate.last_name}</p>
                                        <p className="text-xs text-muted-foreground">{candidate.pokemon_player_id} (Born: {candidate.birth_year})</p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0"
                                        onClick={() => handleAdd(candidate)}
                                        disabled={addingId === candidate.id}
                                    >
                                        {addingId === candidate.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* List Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">Current Roster ({currentRoster.length})</h3>
                        {requiresDeckList && currentRoster.length > 0 && (
                            <Badge variant="outline" className="gap-1 text-xs">
                                <ScrollText className="h-3 w-3" />
                                {currentRoster.filter(p => p.deck_list_status === 'online' || p.deck_list_status === 'paper').length}/{currentRoster.length} {listLabel.toLowerCase()}s
                            </Badge>
                        )}
                    </div>

                    <div className="border rounded-md divide-y max-h-[400px] overflow-y-auto">
                        {currentRoster.length === 0 ? (
                            <p className="text-sm text-muted-foreground p-4 text-center">No players added yet.</p>
                        ) : (
                            currentRoster.map((player) => (
                                <div key={player.id} className="flex items-center justify-between p-3 text-sm">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <Button 
                                                variant="link"
                                                onClick={() => {
                                                    setSelectedPlayer({
                                                        id: player.tom_player_id || player.id,
                                                        name: `${player.first_name} ${player.last_name}`
                                                    });
                                                    setIsDeckModalOpen(true);
                                                }}
                                                className="text-left font-medium p-0 h-auto"
                                            >
                                                {player.first_name} {player.last_name}
                                            </Button>
                                            {requiresDeckList && (
                                                player.deck_list_status === 'online' ? (
                                                    <Badge variant="default" className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 text-xs px-1.5 py-0">
                                                        ✓
                                                    </Badge>
                                                ) : player.deck_list_status === 'paper' ? (
                                                    <Badge variant="default" className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs px-1.5 py-0">
                                                        📄
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="destructive" className="text-xs px-1.5 py-0">
                                                        No {listLabel.toLowerCase()}
                                                    </Badge>
                                                )
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            ID: {player.tom_player_id || "N/A"}
                                            {player.birth_year ? ` • Born: ${player.birth_year}` : ""}
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleRemove(player)}
                                        disabled={removingId === player.id}
                                    >
                                        {removingId === player.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </CardContent>

            <OrganizerDeckModal 
                isOpen={isDeckModalOpen}
                onClose={() => setIsDeckModalOpen(false)}
                tournamentId={tournamentId}
                player={selectedPlayer}
            />
        </Card>
    );
}
