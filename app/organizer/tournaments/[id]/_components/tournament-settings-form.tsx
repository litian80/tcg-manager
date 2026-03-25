"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Tournament {
    id: string;
    tom_uid: string | null;
    organizer_popid: string | null;
    registration_open?: boolean;
    capacity_juniors?: number;
    capacity_seniors?: number;
    capacity_masters?: number;
    juniors_birth_year_max?: number | null;
    seniors_birth_year_max?: number | null;
    publish_roster?: boolean;
    start_time?: string | null;
    deck_submission_cutoff_hours?: number;
    requires_deck_list?: boolean;
    deck_list_submission_deadline?: string | null;
    tournament_mode?: string;
}

interface TournamentSettingsFormProps {
    tournament: Tournament;
    isAdmin?: boolean;
}

export function TournamentSettingsForm({ tournament, isAdmin = false }: TournamentSettingsFormProps) {
    const [tournamentMode, setTournamentMode] = useState(tournament.tournament_mode || "LEAGUECHALLENGE");
    const [tomUid, setTomUid] = useState(tournament.tom_uid || "");
    const [organizerPopid, setOrganizerPopid] = useState(tournament.organizer_popid || "");
    const [registrationOpen, setRegistrationOpen] = useState(tournament.registration_open || false);
    const [publishRoster, setPublishRoster] = useState(tournament.publish_roster ?? true);
    const [requiresDeckList, setRequiresDeckList] = useState(tournament.requires_deck_list || false);
    const [deckSubmissionCutoffHours, setDeckSubmissionCutoffHours] = useState(tournament.deck_submission_cutoff_hours?.toString() || "1");
    const [capJuniors, setCapJuniors] = useState(tournament.capacity_juniors?.toString() || "0");
    const [capSeniors, setCapSeniors] = useState(tournament.capacity_seniors?.toString() || "0");
    const [capMasters, setCapMasters] = useState(tournament.capacity_masters?.toString() || "0");
    const [jrMax, setJrMax] = useState(tournament.juniors_birth_year_max?.toString() || "");
    const [srMax, setSrMax] = useState(tournament.seniors_birth_year_max?.toString() || "");
    
    // For start time - split date and time
    const [startDate, setStartDate] = useState("");
    const [startTime, setStartTime] = useState("09:00");
    
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    // Parse start_time into date and time components on mount
    useEffect(() => {
        if (tournament.start_time) {
            try {
                const date = new Date(tournament.start_time);
                if (!isNaN(date.getTime())) {
                    setStartDate(date.toISOString().split('T')[0]);
                    setStartTime(date.toTimeString().slice(0, 5));
                }
            } catch (error) {
                console.error("Error parsing start_time:", error);
            }
        }
    }, [tournament.start_time]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const supabase = createClient();

        // Validation: xx-xx-xxxxxx
        const pattern = /^\d{2}-\d{2}-\d{6}$/;
        if (tomUid && !pattern.test(tomUid)) {
            toast.error("Format must be YY-MM-ID (e.g., 26-01-123456)");
            setIsLoading(false);
            return;
        }

        // Validate deck submission cutoff
        const cutoffHours = parseInt(deckSubmissionCutoffHours, 10);
        if (cutoffHours < 0 || cutoffHours > 48) {
            toast.error("Deck submission cutoff must be between 0 and 48 hours.");
            setIsLoading(false);
            return;
        }


        // Calculate start_time from date and time
        let startTimeValue = null;
        let deckListSubmissionDeadline = tournament.deck_list_submission_deadline;
        
        if (startDate && startTime) {
            try {
                // Combine date and time in local timezone
                const combinedDateTime = new Date(`${startDate}T${startTime}`);
                if (isNaN(combinedDateTime.getTime())) {
                    throw new Error("Invalid date/time");
                }
                
                startTimeValue = combinedDateTime.toISOString();
                
                // Recalculate deck list submission deadline if start time changes
                if (cutoffHours > 0) {
                    const deadlineDate = new Date(combinedDateTime.getTime() - (cutoffHours * 60 * 60 * 1000));
                    deckListSubmissionDeadline = deadlineDate.toISOString();
                } else {
                    deckListSubmissionDeadline = null;
                }
            } catch (error) {
                console.error("Error processing start time:", error);
                toast.error("Invalid start date/time format");
                setIsLoading(false);
                return;
            }
        }

        const { error } = await supabase
            .from("tournaments")
            .update({ 
                tournament_mode: tournamentMode,
                tom_uid: tomUid || null,
                ...(isAdmin ? { organizer_popid: organizerPopid || null } : {}),
                registration_open: registrationOpen,
                publish_roster: publishRoster,
                requires_deck_list: requiresDeckList,
                deck_submission_cutoff_hours: cutoffHours,
                deck_list_submission_deadline: deckListSubmissionDeadline,
                deck_size: 60,
                sideboard_size: 0,
                capacity_juniors: parseInt(capJuniors || "0", 10),
                capacity_seniors: parseInt(capSeniors || "0", 10),
                capacity_masters: parseInt(capMasters || "0", 10),
                juniors_birth_year_max: jrMax ? parseInt(jrMax, 10) : null,
                seniors_birth_year_max: srMax ? parseInt(srMax, 10) : null,
                start_time: startTimeValue,
            })
            .eq("id", tournament.id);

        if (error) {
            console.error(error);
            toast.error("Failed to update settings");
        } else {
            toast.success("Tournament settings saved");
            router.refresh();
        }

        setIsLoading(false);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Tournament Configuration</CardTitle>
                <CardDescription>
                    Configure tournament settings including start time and deck submission deadlines.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-6">
                    {/* Tournament Type Section */}
                    <div className="space-y-2">
                        <Label htmlFor="tournament_mode">Tournament Type</Label>
                        <Select
                            value={tournamentMode}
                            onValueChange={(value) => setTournamentMode(value)}
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

                    {/* Tournament Timing Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Tournament Timing</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start_date">Start Date</Label>
                                <Input
                                    id="start_date"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="start_time">Start Time</Label>
                                <Input
                                    id="start_time"
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Sanction ID Section */}
                    <div className="space-y-2">
                        <Label htmlFor="tom_uid">Sanction ID / TOM UID</Label>
                        <Input
                            id="tom_uid"
                            placeholder="26-01-123456"
                            value={tomUid}
                            onChange={(e) => setTomUid(e.target.value)}
                            pattern="\d{2}-\d{2}-\d{6}"
                            title="Format: YY-MM-XXXXXX (e.g. 26-01-123456)"
                        />
                        <p className="text-xs text-muted-foreground">
                            Format: YY-MM-XXXXXX (e.g. 26-01-123456)
                        </p>
                    </div>

                    {/* Organiser Player ID Section */}
                    <div className="space-y-2">
                        <Label htmlFor="organizer_popid">Organiser Player ID</Label>
                        <Input
                            id="organizer_popid"
                            placeholder="e.g. 1234567"
                            value={organizerPopid}
                            onChange={(e) => setOrganizerPopid(e.target.value)}
                            disabled={!isAdmin}
                            className={!isAdmin ? "bg-muted cursor-not-allowed" : ""}
                        />
                        <p className="text-xs text-muted-foreground">
                            {isAdmin ? "Set the Player ID of the tournament organiser." : "The Player ID of the tournament organiser."}
                        </p>
                    </div>

                    {/* Deck List Settings Section */}
                    <div className="pt-4 border-t space-y-4">
                        <h3 className="text-lg font-medium">Deck List Settings</h3>
                        
                        <div className="flex items-center space-x-2 pb-2">
                            <Checkbox 
                                id="requires_deck_list" 
                                checked={requiresDeckList}
                                onCheckedChange={(checked) => setRequiresDeckList(checked === true)}
                            />
                            <Label htmlFor="requires_deck_list">Require Deck List Submission</Label>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="deck_submission_cutoff_hours">
                                Deck List Submission Cutoff (Hours before start)
                            </Label>
                            <Input
                                id="deck_submission_cutoff_hours"
                                type="number"
                                min="0"
                                max="48"
                                value={deckSubmissionCutoffHours}
                                onChange={(e) => setDeckSubmissionCutoffHours(e.target.value)}
                                disabled={!requiresDeckList}
                            />
                            <p className="text-xs text-muted-foreground">
                                {requiresDeckList 
                                    ? "Players must submit deck lists this many hours before the tournament starts. Set to 0 to disable deadlines."
                                    : "Enable deck list submission to configure deadlines."}
                            </p>
                        </div>

                    </div>

                    {/* Registration Settings Section */}
                    <div className="pt-4 border-t space-y-4">
                        <h3 className="text-lg font-medium">Registration Settings</h3>
                        
                        <div className="flex items-center space-x-2">
                            <Checkbox 
                                id="registration_open" 
                                checked={registrationOpen}
                                onCheckedChange={(checked) => setRegistrationOpen(checked === true)}
                            />
                            <Label htmlFor="registration_open">Enable Online Registration</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2 pb-4">
                            <Checkbox 
                                id="publish_roster" 
                                checked={publishRoster}
                                onCheckedChange={(checked) => setPublishRoster(checked === true)}
                            />
                            <Label htmlFor="publish_roster">Publish Player Roster (Visible to Public)</Label>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="capJuniors">Juniors Capacity</Label>
                                <Input id="capJuniors" type="number" min="0" value={capJuniors} onChange={(e) => setCapJuniors(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="capSeniors">Seniors Capacity</Label>
                                <Input id="capSeniors" type="number" min="0" value={capSeniors} onChange={(e) => setCapSeniors(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="capMasters">Masters Capacity</Label>
                                <Input id="capMasters" type="number" min="0" value={capMasters} onChange={(e) => setCapMasters(e.target.value)} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="jrMax">Juniors: Born after</Label>
                                <Input 
                                    id="jrMax" 
                                    type="number" 
                                    placeholder="2014" 
                                    value={jrMax} 
                                    onChange={(e) => setJrMax(e.target.value)} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="srMax">Seniors: Born after</Label>
                                <Input 
                                    id="srMax" 
                                    type="number" 
                                    placeholder="2010" 
                                    value={srMax} 
                                    onChange={(e) => setSrMax(e.target.value)} 
                                />
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
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Settings
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
