"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Settings2, Sparkles } from "lucide-react";
import { getSeasonCutoffs, getSeasonLabel } from "@/lib/tournament-templates";
import { getListLabel } from "@/lib/utils";

export interface StepRegistrationData {
    registrationOpen: boolean;
    publishRoster: boolean;
    allowOnlineMatch: boolean;
    requiresDeckList: boolean;
    deckCutoff: string;
    overallCapacity: string;
    capJuniors: string;
    capSeniors: string;
    capMasters: string;
    jrMax: string;
    srMax: string;
}

interface StepRegistrationProps {
    data: StepRegistrationData;
    onChange: (data: StepRegistrationData) => void;
    onNext: () => void;
    onBack: () => void;
    showAdvanced: boolean;
    onToggleAdvanced: () => void;
    tournamentMode?: string;
}

export function StepRegistration({ data, onChange, onNext, onBack, showAdvanced, onToggleAdvanced, tournamentMode }: StepRegistrationProps) {
    const season = getSeasonCutoffs();
    const seasonLabel = getSeasonLabel();
    const isGO = tournamentMode === 'GOPREMIER';
    const listLabel = getListLabel(
        tournamentMode === 'VGCPREMIER' ? 'VIDEO_GAME' :
        tournamentMode === 'GOPREMIER' ? 'GO' :
        'TRADING_CARD_GAME'
    );
    const isSeasonCurrent =
        data.jrMax === season.juniorsBornAfter.toString() &&
        data.srMax === season.seniorsBornAfter.toString();

    const update = <K extends keyof StepRegistrationData>(field: K, value: StepRegistrationData[K]) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Registration & Divisions</CardTitle>
                <CardDescription>
                    Configure who can register and division settings.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Registration Toggles */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        Registration
                    </h3>

                    <div className="flex items-center space-x-2">
                        <Switch
                            id="reg_open"
                            checked={data.registrationOpen}
                            onCheckedChange={(v) => {
                                const updates: Partial<StepRegistrationData> = { registrationOpen: v };
                                if (v) updates.requiresDeckList = true;
                                onChange({ ...data, ...updates });
                            }}
                        />
                        <Label htmlFor="reg_open">Enable Online Registration</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch
                            id="roster"
                            checked={data.publishRoster}
                            onCheckedChange={(v) => update("publishRoster", v)}
                        />
                        <Label htmlFor="roster">Publish Player Roster (Visible to Public)</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch
                            id="match_report"
                            checked={data.allowOnlineMatch}
                            onCheckedChange={(v) => update("allowOnlineMatch", v)}
                        />
                        <Label htmlFor="match_report">Enable Online Match Result Reporting</Label>
                    </div>
                </div>

                {/* Deck/Team List Settings */}
                <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        {listLabel}s
                    </h3>

                    <div className="flex items-center space-x-2">
                        <Switch
                            id="deck_list"
                            checked={data.requiresDeckList}
                            onCheckedChange={(v) => update("requiresDeckList", v)}
                        />
                        <Label htmlFor="deck_list">Require {listLabel} Submission</Label>
                    </div>

                    {data.requiresDeckList && (
                        <div className="space-y-2">
                            <Label htmlFor="deck_cutoff">
                                Submission Cutoff (Hours before start)
                            </Label>
                            <Input
                                id="deck_cutoff"
                                type="number"
                                min="0"
                                max="48"
                                value={data.deckCutoff}
                                onChange={(e) => update("deckCutoff", e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Set to 0 to disable deadlines.
                            </p>
                        </div>
                    )}
                </div>

                {/* Overall & Division Capacities */}
                <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        Capacity
                    </h3>

                    <div className="space-y-2">
                        <Label htmlFor="overall_cap">Overall Tournament Capacity</Label>
                        <Input
                            id="overall_cap"
                            type="number"
                            min="0"
                            value={data.overallCapacity}
                            onChange={(e) => update("overallCapacity", e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                        {isGO 
                            ? 'Total players for this event. Pokémon GO uses a unified Open division. Set to 0 for unlimited.'
                            : 'Total players across all divisions. Set to 0 for unlimited. Overrides division caps when reached.'}
                    </p>
                </div>

                    {!isGO && (
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="cap_jr">Juniors</Label>
                            <Input
                                id="cap_jr"
                                type="number"
                                min="0"
                                value={data.capJuniors}
                                onChange={(e) => update("capJuniors", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cap_sr">Seniors</Label>
                            <Input
                                id="cap_sr"
                                type="number"
                                min="0"
                                value={data.capSeniors}
                                onChange={(e) => update("capSeniors", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cap_ma">Masters</Label>
                            <Input
                                id="cap_ma"
                                type="number"
                                min="0"
                                value={data.capMasters}
                                onChange={(e) => update("capMasters", e.target.value)}
                            />
                        </div>
                    </div>
                    )}
                    {!isGO && (
                    <p className="text-xs text-muted-foreground">
                        Set to 0 for unlimited capacity in a division.
                    </p>
                    )}
                </div>

                {/* Age Division Cutoffs (UX-021) */}
                {!isGO && (
                <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                            Age Division Cutoffs
                        </h3>
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
                                        onChange({
                                            ...data,
                                            jrMax: season.juniorsBornAfter.toString(),
                                            srMax: season.seniorsBornAfter.toString(),
                                        });
                                    }}
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
                            <Input
                                id="jr_max"
                                type="number"
                                placeholder={season.juniorsBornAfter.toString()}
                                value={data.jrMax}
                                onChange={(e) => update("jrMax", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sr_max">Seniors: Born in or after</Label>
                            <Input
                                id="sr_max"
                                type="number"
                                placeholder={season.seniorsBornAfter.toString()}
                                value={data.srMax}
                                onChange={(e) => update("srMax", e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md">
                        <p className="font-medium">{seasonLabel} — Age Divisions:</p>
                        <ul className="list-disc pl-5 space-y-1 mt-1">
                            <li>Junior: Born {data.jrMax || season.juniorsBornAfter} or later</li>
                            <li>
                                Senior: Born {data.srMax || season.seniorsBornAfter} to{" "}
                                {parseInt(data.jrMax || season.juniorsBornAfter.toString()) - 1}
                            </li>
                            <li>
                                Master: Born{" "}
                                {parseInt(data.srMax || season.seniorsBornAfter.toString()) - 1} or earlier
                            </li>
                        </ul>
                    </div>
                </div>
                )}

                {/* Navigation */}
                <div className="pt-4 border-t space-y-3">
                    {!showAdvanced && (
                        <button
                            type="button"
                            onClick={onToggleAdvanced}
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-1"
                        >
                            <Settings2 className="h-4 w-4" />
                            Configure Advanced Settings (Queue, Payment, Webhooks)
                        </button>
                    )}
                    <div className="flex justify-between">
                        <Button type="button" variant="outline" onClick={onBack} className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </Button>
                        <Button type="button" onClick={onNext} className="gap-2">
                            {showAdvanced ? "Next: Advanced" : "Next: Review"}
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
