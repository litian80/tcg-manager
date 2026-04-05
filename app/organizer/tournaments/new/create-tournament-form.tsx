"use client";

import { useState, useEffect } from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { createTournament } from "@/actions/tournament/create";
import { Loader2, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import type { TournamentFormDefaults } from "@/lib/tournament-templates";
import { getSeasonCutoffs, getSeasonLabel } from "@/lib/tournament-templates";

type FormState = { error: string } | undefined;

interface CreateTournamentFormProps {
    userRole: string;
    userPopId: string;
    defaults?: TournamentFormDefaults;
    duplicateName?: string;
}

async function submitTournament(prevState: FormState, formData: FormData) {
    return await createTournament(formData);
}

export function CreateTournamentForm({ userRole, userPopId, defaults, duplicateName }: CreateTournamentFormProps) {
    const isAdmin = userRole === 'admin';
    const [state, formAction, isPending] = useActionState(submitTournament, undefined);
    
    // UX-021: Season cutoffs for smart defaults
    const season = getSeasonCutoffs();
    const seasonLabel = getSeasonLabel();

    // Core fields — always visible
    const [tournamentMode, setTournamentMode] = useState(defaults?.tournament_mode || "LEAGUECHALLENGE");
    const [name, setName] = useState(duplicateName || "");
    const [city, setCity] = useState(defaults?.city || "");
    const [country, setCountry] = useState(defaults?.country || "");
    const defaultTime = defaults?.start_time || "13:00";

    // Advanced settings — collapsed when using a template
    const [advancedOpen, setAdvancedOpen] = useState(!defaults);
    const [requiresDeckList, setRequiresDeckList] = useState(defaults?.requires_deck_list ?? false);
    const [deckCutoff, setDeckCutoff] = useState(defaults?.deck_submission_cutoff_hours?.toString() ?? "0");
    const [registrationOpen, setRegistrationOpen] = useState(defaults?.registration_open ?? false);
    const [publishRoster, setPublishRoster] = useState(defaults?.publish_roster ?? true);
    const [allowOnlineMatch, setAllowOnlineMatch] = useState(defaults?.allow_online_match_reporting ?? false);
    const [capJuniors, setCapJuniors] = useState(defaults?.capacity_juniors?.toString() ?? "0");
    const [capSeniors, setCapSeniors] = useState(defaults?.capacity_seniors?.toString() ?? "0");
    const [capMasters, setCapMasters] = useState(defaults?.capacity_masters?.toString() ?? "0");
    const [jrMax, setJrMax] = useState(defaults?.juniors_birth_year_max?.toString() ?? season.juniorsBornAfter.toString());
    const [srMax, setSrMax] = useState(defaults?.seniors_birth_year_max?.toString() ?? season.seniorsBornAfter.toString());

    // Reset all fields when defaults change (template switch or duplicate load)
    useEffect(() => {
        if (!defaults) return;
        setTournamentMode(defaults.tournament_mode || "LEAGUECHALLENGE");
        setCity(defaults.city || "");
        setCountry(defaults.country || "");
        setRequiresDeckList(defaults.requires_deck_list ?? false);
        setDeckCutoff(defaults.deck_submission_cutoff_hours?.toString() ?? "0");
        setRegistrationOpen(defaults.registration_open ?? false);
        setPublishRoster(defaults.publish_roster ?? true);
        setAllowOnlineMatch(defaults.allow_online_match_reporting ?? false);
        setCapJuniors(defaults.capacity_juniors?.toString() ?? "0");
        setCapSeniors(defaults.capacity_seniors?.toString() ?? "0");
        setCapMasters(defaults.capacity_masters?.toString() ?? "0");
        setJrMax(defaults.juniors_birth_year_max?.toString() ?? season.juniorsBornAfter.toString());
        setSrMax(defaults.seniors_birth_year_max?.toString() ?? season.seniorsBornAfter.toString());
        setAdvancedOpen(false);
    }, [defaults, season.juniorsBornAfter, season.seniorsBornAfter]);

    // UX-021: Check if current cutoffs match the current season
    const isSeasonCurrent = jrMax === season.juniorsBornAfter.toString() && srMax === season.seniorsBornAfter.toString();

    // Build a summary line for collapsed state
    const summaryParts: string[] = [];
    const totalCap = parseInt(capJuniors || "0") + parseInt(capSeniors || "0") + parseInt(capMasters || "0");
    if (totalCap > 0) summaryParts.push(`${totalCap} player cap`);
    if (requiresDeckList) summaryParts.push(`Deck lists (${deckCutoff}h cutoff)`);
    if (registrationOpen) summaryParts.push("Registration open");
    const summaryText = summaryParts.length > 0 ? summaryParts.join(" · ") : "Default settings";

    return (
        <Card>
            <CardHeader>
                <CardTitle>Tournament Details</CardTitle>
                <CardDescription>
                    {defaults
                        ? "Template settings applied. Fill in the details below."
                        : "Enter the tournament information."
                    }
                </CardDescription>
            </CardHeader>
            <CardContent>
                {state?.error && (
                    <div className="mb-6 p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md font-medium">
                        {state.error}
                    </div>
                )}
                
                <form action={formAction} className="space-y-4">
                    {/* Hidden fields for template values */}
                    <input type="hidden" name="tournament_mode" value={tournamentMode} />
                    <input type="hidden" name="requires_deck_list" value={requiresDeckList ? "true" : ""} />
                    <input type="hidden" name="requires_deck_list_fallback" value="false" />
                    <input type="hidden" name="deck_submission_cutoff_hours" value={deckCutoff} />
                    <input type="hidden" name="registration_open" value={registrationOpen ? "true" : ""} />
                    <input type="hidden" name="registration_open_fallback" value="false" />
                    <input type="hidden" name="publish_roster" value={publishRoster ? "true" : ""} />
                    <input type="hidden" name="publish_roster_fallback" value="false" />
                    <input type="hidden" name="allow_online_match_reporting" value={allowOnlineMatch ? "true" : ""} />
                    <input type="hidden" name="allow_online_match_reporting_fallback" value="false" />
                    <input type="hidden" name="capacity_juniors" value={capJuniors} />
                    <input type="hidden" name="capacity_seniors" value={capSeniors} />
                    <input type="hidden" name="capacity_masters" value={capMasters} />
                    <input type="hidden" name="juniors_birth_year_max" value={jrMax} />
                    <input type="hidden" name="seniors_birth_year_max" value={srMax} />

                    {/* === CORE FIELDS — Always Visible === */}
                    <div className="space-y-2">
                        <Label htmlFor="tournament_mode_display">Tournament Type</Label>
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
                        <Input 
                            id="name" 
                            name="name" 
                            placeholder="e.g. Monthly League Challenge" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required 
                            disabled={isPending} 
                        />
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
                            <Input 
                                id="city" 
                                name="city" 
                                placeholder="e.g. Auckland" 
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                required 
                                disabled={isPending} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="country">Country</Label>
                            <Input 
                                id="country" 
                                name="country" 
                                placeholder="e.g. New Zealand"
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                disabled={isPending} 
                            />
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

                    {/* === ADVANCED SETTINGS — Collapsible when template is active === */}
                    <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                        <CollapsibleTrigger asChild>
                            <button
                                type="button"
                                className="flex items-center justify-between w-full py-3 px-4 border rounded-md text-sm hover:bg-accent/50 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">Advanced Settings</span>
                                    {!advancedOpen && (
                                        <span className="text-xs text-muted-foreground">{summaryText}</span>
                                    )}
                                </div>
                                {advancedOpen ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                )}
                            </button>
                        </CollapsibleTrigger>

                        <CollapsibleContent className="space-y-4 pt-4">
                            {/* Deck List Settings */}
                            <div className="space-y-4 pt-2 border-t">
                                <h3 className="text-lg font-medium">Deck List Settings</h3>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="deck_cutoff_display">
                                        Deck List Submission Cutoff (Hours before start)
                                    </Label>
                                    <Input 
                                        id="deck_cutoff_display" 
                                        type="number" 
                                        min="0" 
                                        max="48"
                                        value={deckCutoff}
                                        onChange={(e) => setDeckCutoff(e.target.value)}
                                        disabled={isPending}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Set to 0 to disable deadlines.
                                    </p>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Switch 
                                        id="requires_deck_list_toggle"
                                        checked={requiresDeckList}
                                        onCheckedChange={setRequiresDeckList}
                                        disabled={isPending} 
                                    />
                                    <Label htmlFor="requires_deck_list_toggle">Require Deck List Submission</Label>
                                </div>
                            </div>

                            {/* Registration Settings */}
                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-lg font-medium">Registration Settings</h3>
                                
                                <div className="flex items-center space-x-2">
                                    <Switch 
                                        id="reg_open_toggle"
                                        checked={registrationOpen}
                                        onCheckedChange={setRegistrationOpen}
                                        disabled={isPending} 
                                    />
                                    <Label htmlFor="reg_open_toggle">Enable Online Registration</Label>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                    <Switch 
                                        id="roster_toggle"
                                        checked={publishRoster}
                                        onCheckedChange={setPublishRoster}
                                        disabled={isPending} 
                                    />
                                    <Label htmlFor="roster_toggle">Publish Player Roster (Visible to Public)</Label>
                                </div>

                                <div className="flex items-center space-x-2 pb-4">
                                    <Switch 
                                        id="match_report_toggle"
                                        checked={allowOnlineMatch}
                                        onCheckedChange={setAllowOnlineMatch}
                                        disabled={isPending} 
                                    />
                                    <Label htmlFor="match_report_toggle">Enable Online Match Result Reporting</Label>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="cap_jr">Juniors Capacity</Label>
                                        <Input id="cap_jr" type="number" min="0" value={capJuniors} onChange={(e) => setCapJuniors(e.target.value)} disabled={isPending} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="cap_sr">Seniors Capacity</Label>
                                        <Input id="cap_sr" type="number" min="0" value={capSeniors} onChange={(e) => setCapSeniors(e.target.value)} disabled={isPending} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="cap_ma">Masters Capacity</Label>
                                        <Input id="cap_ma" type="number" min="0" value={capMasters} onChange={(e) => setCapMasters(e.target.value)} disabled={isPending} />
                                    </div>
                                </div>

                                {/* UX-021: Smart Division Defaults */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-base">Age Division Cutoffs</Label>
                                        <div className="flex items-center gap-2">
                                            {isSeasonCurrent ? (
                                                <Badge variant="secondary" className="text-[10px]">
                                                    ✓ {seasonLabel}
                                                </Badge>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 text-xs gap-1"
                                                    onClick={() => {
                                                        setJrMax(season.juniorsBornAfter.toString());
                                                        setSrMax(season.seniorsBornAfter.toString());
                                                    }}
                                                    disabled={isPending}
                                                >
                                                    <Sparkles className="h-3 w-3" />
                                                    Apply {seasonLabel}
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="jr_max">Juniors: Born in or after</Label>
                                            <Input id="jr_max" type="number" placeholder={season.juniorsBornAfter.toString()} value={jrMax} onChange={(e) => setJrMax(e.target.value)} disabled={isPending} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="sr_max">Seniors: Born in or after</Label>
                                            <Input id="sr_max" type="number" placeholder={season.seniorsBornAfter.toString()} value={srMax} onChange={(e) => setSrMax(e.target.value)} disabled={isPending} />
                                        </div>
                                    </div>

                                    <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md">
                                        <p className="font-medium">{seasonLabel} — Age Divisions:</p>
                                        <ul className="list-disc pl-5 space-y-1 mt-1">
                                            <li>Junior: Born {jrMax || season.juniorsBornAfter} or later</li>
                                            <li>Senior: Born {srMax || season.seniorsBornAfter} to {parseInt(jrMax || season.juniorsBornAfter.toString()) - 1}</li>
                                            <li>Master: Born {parseInt(srMax || season.seniorsBornAfter.toString()) - 1} or earlier</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>

                    <div className="pt-4 mt-4 border-t">
                        <Button type="submit" className="w-full" disabled={isPending}>
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Tournament'
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

