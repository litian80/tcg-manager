"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { getSeasonCutoffs, getSeasonLabel } from "@/lib/tournament-templates";

interface RegistrationPanelProps {
    registrationOpen: boolean;
    setRegistrationOpen: (v: boolean) => void;
    publishRoster: boolean;
    setPublishRoster: (v: boolean) => void;
    overallCapacity: string;
    setOverallCapacity: (v: string) => void;
    capJuniors: string;
    setCapJuniors: (v: string) => void;
    capSeniors: string;
    setCapSeniors: (v: string) => void;
    capMasters: string;
    setCapMasters: (v: string) => void;
    jrMax: string;
    setJrMax: (v: string) => void;
    srMax: string;
    setSrMax: (v: string) => void;
}

export function RegistrationPanel({
    registrationOpen, setRegistrationOpen,
    publishRoster, setPublishRoster,
    overallCapacity, setOverallCapacity,
    capJuniors, setCapJuniors,
    capSeniors, setCapSeniors,
    capMasters, setCapMasters,
    jrMax, setJrMax,
    srMax, setSrMax,
}: RegistrationPanelProps) {
    const season = getSeasonCutoffs();
    const seasonLabel = getSeasonLabel();
    const isSeasonCurrent = jrMax === season.juniorsBornAfter.toString() && srMax === season.seniorsBornAfter.toString();

    return (
        <div className="space-y-6">
            {/* Registration Toggles */}
            <div className="space-y-4">
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
            </div>

            {/* Capacity */}
            <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-medium">Capacity</h3>

                <div className="space-y-2">
                    <Label htmlFor="overallCapacity">Overall Tournament Capacity</Label>
                    <Input id="overallCapacity" type="number" min="0" value={overallCapacity} onChange={(e) => setOverallCapacity(e.target.value)} />
                    <p className="text-xs text-muted-foreground">
                        Maximum total players across all divisions. Set to 0 for unlimited. When set, registration closes once this limit is reached even if individual division caps are not full.
                    </p>
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
            </div>

            {/* Age Division Cutoffs (UX-021) */}
            <div className="space-y-3 pt-4 border-t">
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
                            >
                                <Sparkles className="h-3 w-3" />
                                Apply {seasonLabel}
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="jrMax">Juniors: Born in or after</Label>
                        <Input
                            id="jrMax"
                            type="number"
                            placeholder={season.juniorsBornAfter.toString()}
                            value={jrMax}
                            onChange={(e) => setJrMax(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="srMax">Seniors: Born in or after</Label>
                        <Input
                            id="srMax"
                            type="number"
                            placeholder={season.seniorsBornAfter.toString()}
                            value={srMax}
                            onChange={(e) => setSrMax(e.target.value)}
                        />
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
    );
}
