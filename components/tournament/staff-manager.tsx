"use client";

import { useState, useEffect } from "react";
import { UserResult, searchUsers, addJudge, removeJudge } from "@/app/tournament/actions";
import { useDebounce } from "@/hooks/use-debounce";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Trash2, UserPlus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface StaffManagerProps {
    tournamentId: string;
    judges: UserResult[];
}

export function StaffManager({ tournamentId, judges }: StaffManagerProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounce(query, 300);
    const [results, setResults] = useState<UserResult[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (debouncedQuery.length < 2) {
            setResults([]);
            return;
        }

        const fetchUsers = async () => {
            setLoading(true);
            try {
                const users = await searchUsers(debouncedQuery);
                // Filter out users already in the judge list
                const filtered = users.filter((u) => !judges.some((j) => j.id === u.id));
                setResults(filtered);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [debouncedQuery, judges]);

    const handleAddUser = async (user: UserResult) => {
        try {
            toast.info("Adding judge...");
            await addJudge(tournamentId, user.id);
            toast.success(`${user.display_name || user.email} added as Judge`);
            setOpen(false);
            setQuery("");
        } catch (error) {
            toast.error("Failed to add judge");
            console.error(error);
        }
    };

    const handleRemoveUser = async (user: UserResult) => {
        if (!confirm(`Remove ${user.display_name || user.email} from staff?`)) return;

        try {
            toast.info("Removing judge...");
            await removeJudge(tournamentId, user.id);
            toast.success("Judge removed");
        } catch (error) {
            toast.error("Failed to remove judge");
            console.error(error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Tournament Staff</h3>
                    <p className="text-sm text-muted-foreground">
                        Manage judges and staff members for this tournament.
                    </p>
                </div>
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-[150px] justify-start">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Add Judge
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" side="bottom" align="end">
                        <Command shouldFilter={false}>
                            <CommandInput
                                placeholder="Search by name, email, or PID..."
                                value={query}
                                onValueChange={setQuery}
                            />
                            <CommandList>
                                {loading && <div className="p-2 text-sm text-muted-foreground text-center">Searching...</div>}
                                {!loading && query.length >= 2 && results.length === 0 && (
                                    <CommandEmpty>No users found.</CommandEmpty>
                                )}
                                <CommandGroup heading="Results">
                                    {results.map((user) => (
                                        <CommandItem
                                            key={user.id}
                                            onSelect={() => handleAddUser(user)}
                                            className="flex items-center gap-2 cursor-pointer"
                                        >
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={""} />
                                                <AvatarFallback>{(user.display_name || "?")[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">
                                                    {user.display_name}
                                                    {user.pokemon_player_id && <span className="text-xs text-muted-foreground ml-1">(ID: {user.pokemon_player_id})</span>}
                                                </span>
                                                <span className="text-xs text-muted-foreground">{user.email}</span>
                                            </div>
                                            {user.role === 'judge' || user.role === 'admin' || user.role === 'organizer' ? (
                                                <ShieldCheck className="ml-auto h-4 w-4 text-green-500" />
                                            ) : null}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            <div className="border rounded-md">
                <div className="p-4 bg-muted/50 border-b">
                    <h4 className="text-sm font-medium">Current Judges</h4>
                </div>
                <div className="divide-y">
                    {judges.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            No judges assigned yet.
                        </div>
                    ) : (
                        judges.map((judge) => (
                            <div key={judge.id} className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={""} />
                                        <AvatarFallback>{(judge.display_name || "?")[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium flex items-center gap-2">
                                            {judge.display_name}
                                            {judge.role === 'admin' && <span className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded">Admin</span>}
                                            {judge.role === 'organizer' && <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Org</span>}
                                        </p>
                                        <p className="text-sm text-muted-foreground">{judge.email}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleRemoveUser(judge)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
