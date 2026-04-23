"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface GeneralPanelProps {
    tournamentMode: string;
    setTournamentMode: (v: string) => void;
    startDate: string;
    setStartDate: (v: string) => void;
    startTime: string;
    setStartTime: (v: string) => void;
    tomUid: string;
    setTomUid: (v: string) => void;
    organizerPopid: string;
    setOrganizerPopid: (v: string) => void;
    isAdmin: boolean;
    allowOnlineMatchReporting: boolean;
    setAllowOnlineMatchReporting: (v: boolean) => void;
}

export function GeneralPanel({
    tournamentMode, setTournamentMode,
    startDate, setStartDate,
    startTime, setStartTime,
    tomUid, setTomUid,
    organizerPopid, setOrganizerPopid,
    isAdmin,
    allowOnlineMatchReporting, setAllowOnlineMatchReporting,
}: GeneralPanelProps) {
    return (
        <div className="space-y-6">
            {/* Tournament Type */}
            <div className="space-y-2">
                <Label htmlFor="tournament_mode">Tournament Type</Label>
                <Select value={tournamentMode} onValueChange={setTournamentMode} disabled>
                    <SelectTrigger className="bg-muted cursor-not-allowed">
                        <SelectValue placeholder="Select tournament type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="LEAGUECHALLENGE">League Challenge</SelectItem>
                        <SelectItem value="TCG1DAY">League Cup</SelectItem>
                        <SelectItem value="PRERELEASE">Prerelease / Draft</SelectItem>
                        <SelectItem value="VGCPREMIER">VGC Premier Challenge</SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                    Tournament type is locked after creation and cannot be changed.
                </p>
            </div>

            {/* Tournament Timing */}
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

            {/* Sanction ID */}
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

            {/* Organiser Player ID */}
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

            {/* Match Reporting */}
            <div className="pt-4 border-t space-y-4">
                <h3 className="text-lg font-medium">Match Reporting</h3>
                <div className="flex items-center space-x-2 pb-2">
                    <Checkbox
                        id="allow_online_match_reporting"
                        checked={allowOnlineMatchReporting}
                        onCheckedChange={(checked) => setAllowOnlineMatchReporting(checked === true)}
                    />
                    <Label htmlFor="allow_online_match_reporting">Enable Online Match Result Reporting</Label>
                </div>
                <p className="text-xs text-muted-foreground -mt-3">
                    When enabled, allows players to self-report match results from their player dashboard.
                </p>
            </div>
        </div>
    );
}
