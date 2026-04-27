"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight } from "lucide-react";

export interface StepBasicsData {
    tournamentMode: string;
    name: string;
    date: string;
    startTime: string;
    city: string;
    country: string;
    tomUid: string;
    organizerPopid: string;
}

interface StepBasicsProps {
    data: StepBasicsData;
    onChange: (data: StepBasicsData) => void;
    onNext: () => void;
    userPopId: string;
    isAdmin: boolean;
    errors: Record<string, string>;
}

export function StepBasics({ data, onChange, onNext, userPopId, isAdmin, errors }: StepBasicsProps) {
    const update = (field: keyof StepBasicsData, value: string) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Event Details</CardTitle>
                <CardDescription>
                    What event are you running? Fill in the basics.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="tournament_mode">Tournament Type</Label>
                    <Select
                        value={data.tournamentMode}
                        onValueChange={(v) => update("tournamentMode", v)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select tournament type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="LEAGUECHALLENGE">League Challenge</SelectItem>
                            <SelectItem value="TCG1DAY">League Cup</SelectItem>
                            <SelectItem value="PRERELEASE">Prerelease / Draft</SelectItem>
                            <SelectItem value="VGCPREMIER">VGC Premier Challenge</SelectItem>
                            <SelectItem value="GOPREMIER">Pokémon GO Tournament</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="name">Tournament Name</Label>
                    <Input
                        id="name"
                        placeholder="e.g. Monthly League Challenge"
                        value={data.name}
                        onChange={(e) => update("name", e.target.value)}
                    />
                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Input
                            id="date"
                            type="date"
                            value={data.date}
                            onChange={(e) => update("date", e.target.value)}
                        />
                        {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="start_time">Start Time</Label>
                        <Input
                            id="start_time"
                            type="time"
                            value={data.startTime}
                            onChange={(e) => update("startTime", e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                            id="city"
                            placeholder="e.g. Auckland"
                            value={data.city}
                            onChange={(e) => update("city", e.target.value)}
                        />
                        {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Input
                            id="country"
                            placeholder="e.g. New Zealand"
                            value={data.country}
                            onChange={(e) => update("country", e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="tom_uid">Sanction ID (TOM UID)</Label>
                    <Input
                        id="tom_uid"
                        placeholder="XX-XX-XXXXXX"
                        value={data.tomUid}
                        onChange={(e) => update("tomUid", e.target.value)}
                    />
                    {errors.tomUid ? (
                        <p className="text-xs text-destructive">{errors.tomUid}</p>
                    ) : (
                        <p className="text-xs text-muted-foreground">Optional. Format: 25-01-000001</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="organizer_popid">Organiser Player ID</Label>
                    <Input
                        id="organizer_popid"
                        placeholder="e.g. 1234567"
                        value={data.organizerPopid}
                        onChange={(e) => update("organizerPopid", e.target.value)}
                        disabled={!isAdmin}
                        className={!isAdmin ? "bg-muted cursor-not-allowed" : ""}
                    />
                    <p className="text-xs text-muted-foreground">
                        {isAdmin
                            ? "Set the Player ID of the tournament organiser."
                            : "Your Player ID will be used as the tournament organiser."}
                    </p>
                </div>

                <div className="pt-4 border-t flex justify-end">
                    <Button type="button" onClick={onNext} className="gap-2">
                        Next: Registration
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
