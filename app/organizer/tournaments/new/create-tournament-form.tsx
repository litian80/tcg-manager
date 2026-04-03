"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTournament } from "@/actions/tournament/create";
import { Loader2 } from "lucide-react";

// Define the expected return type of the server action
type FormState = { error: string } | undefined;

interface CreateTournamentFormProps {
    userRole: string;
    userPopId: string;
}

// Wrapper function to pass to useActionState
async function submitTournament(prevState: FormState, formData: FormData) {
    return await createTournament(formData);
}

export function CreateTournamentForm({ userRole, userPopId }: CreateTournamentFormProps) {
    const isAdmin = userRole === 'admin';
    const [state, formAction, isPending] = useActionState(submitTournament, undefined);
    const [tournamentMode, setTournamentMode] = useState("LEAGUECHALLENGE");

    // Set default time to 09:00
    const defaultTime = "09:00";

    return (
        <Card>
            <CardHeader>
                <CardTitle>Tournament Details</CardTitle>
                <CardDescription>
                    Enter the tournament information. This will be used to generate the initial TDF file.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {state?.error && (
                    <div className="mb-6 p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md font-medium">
                        {state.error}
                    </div>
                )}
                
                <form action={formAction} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="tournament_mode">Tournament Type</Label>
                        <input type="hidden" name="tournament_mode" value={tournamentMode} />
                        <Select
                            value={tournamentMode}
                            onValueChange={setTournamentMode}
                            disabled={isPending}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select tournament type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="LEAGUECHALLENGE">League Challenge</SelectItem>
                                <SelectItem value="TCG1DAY">League Cup</SelectItem>
                                <SelectItem value="PRERELEASE">Prerelease / Draft</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">Tournament Name</Label>
                        <Input id="name" name="name" placeholder="e.g. Monthly League Challenge" required disabled={isPending} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="date">Date</Label>
                            <Input id="date" name="date" type="date" required disabled={isPending} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="start_time">Start Time</Label>
                            <Input 
                                id="start_time" 
                                name="start_time" 
                                type="time" 
                                defaultValue={defaultTime}
                                required 
                                disabled={isPending} 
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="city">City</Label>
                            <Input id="city" name="city" placeholder="e.g. Auckland" required disabled={isPending} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="country">Country</Label>
                            <Input id="country" name="country" defaultValue="New Zealand" disabled={isPending} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="tom_uid">Sanction ID (TOM UID)</Label>
                        <Input id="tom_uid" name="tom_uid" placeholder="XX-XX-XXXXXX" disabled={isPending} />
                        <p className="text-xs text-muted-foreground">Optional. Format: 25-01-000001</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="organizer_popid">Organiser Player ID</Label>
                        <Input 
                            id="organizer_popid" 
                            name="organizer_popid" 
                            placeholder="e.g. 1234567" 
                            defaultValue={userPopId}
                            disabled={isPending || !isAdmin}
                            className={!isAdmin ? "bg-muted cursor-not-allowed" : ""}
                        />
                        <p className="text-xs text-muted-foreground">
                            {isAdmin ? "Set the Player ID of the tournament organiser." : "Your Player ID will be used as the tournament organiser."}
                        </p>
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                        <h3 className="text-lg font-medium">Deck List Settings</h3>
                        
                        <div className="space-y-2">
                            <Label htmlFor="deck_submission_cutoff_hours">
                                Deck List Submission Cutoff (Hours before start)
                            </Label>
                            <Input 
                                id="deck_submission_cutoff_hours" 
                                name="deck_submission_cutoff_hours" 
                                type="number" 
                                min="0" 
                                max="48"
                                defaultValue="1"
                                disabled={isPending}
                                placeholder="e.g., 1 hour before tournament start"
                            />
                            <p className="text-xs text-muted-foreground">
                                Players must submit deck lists this many hours before the tournament starts. Set to 0 to disable deadlines.
                            </p>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch id="requires_deck_list" name="requires_deck_list" value="true" disabled={isPending} />
                            <Label htmlFor="requires_deck_list">Require Deck List Submission</Label>
                            <input type="hidden" name="requires_deck_list_fallback" value="false" />
                        </div>

                    </div>

                    <div className="space-y-4 pt-4 border-t">
                        <h3 className="text-lg font-medium">Registration Settings</h3>
                        
                        <div className="flex items-center space-x-2">
                            <Switch id="registration_open" name="registration_open" value="true" disabled={isPending} />
                            <Label htmlFor="registration_open">Enable Online Registration</Label>
                            <input type="hidden" name="registration_open_fallback" value="false" />
                        </div>
                        
                        <div className="flex items-center space-x-2">
                            <Switch id="publish_roster" name="publish_roster" value="true" disabled={isPending} defaultChecked />
                            <Label htmlFor="publish_roster">Publish Player Roster (Visible to Public)</Label>
                            <input type="hidden" name="publish_roster_fallback" value="false" />
                        </div>

                        <div className="flex items-center space-x-2 pb-4">
                            <Switch id="allow_online_match_reporting" name="allow_online_match_reporting" value="true" disabled={isPending} />
                            <Label htmlFor="allow_online_match_reporting">Enable Online Match Result Reporting</Label>
                            <input type="hidden" name="allow_online_match_reporting_fallback" value="false" />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="capacity_juniors">Juniors Capacity</Label>
                                <Input id="capacity_juniors" name="capacity_juniors" type="number" min="0" defaultValue="0" disabled={isPending} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="capacity_seniors">Seniors Capacity</Label>
                                <Input id="capacity_seniors" name="capacity_seniors" type="number" min="0" defaultValue="0" disabled={isPending} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="capacity_masters">Masters Capacity</Label>
                                <Input id="capacity_masters" name="capacity_masters" type="number" min="0" defaultValue="0" disabled={isPending} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="juniors_birth_year_max">Juniors: Born after</Label>
                                <Input 
                                    id="juniors_birth_year_max" 
                                    name="juniors_birth_year_max" 
                                    type="number" 
                                    placeholder="2014" 
                                    disabled={isPending} 
                                />
                                <p className="text-xs text-muted-foreground">
                                    Players born in 2014 or later
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="seniors_birth_year_max">Seniors: Born after</Label>
                                <Input 
                                    id="seniors_birth_year_max" 
                                    name="seniors_birth_year_max" 
                                    type="number" 
                                    placeholder="2010" 
                                    disabled={isPending} 
                                />
                                <p className="text-xs text-muted-foreground">
                                    Players born 2010 to 2013
                                </p>
                            </div>
                        </div>
                        <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md">
                            <p className="font-medium">Age Division Rules:</p>
                            <ul className="list-disc pl-5 space-y-1 mt-1">
                                <li>Junior: Born in or after the Junior year</li>
                                <li>Senior: Born in or after the Senior year (but younger than Junior threshold)</li>
                                <li>Master: Born before the Senior year</li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-4 mt-8 border-t">
                        <Button type="submit" className="w-full" disabled={isPending}>
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create & Configure Roster'
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
