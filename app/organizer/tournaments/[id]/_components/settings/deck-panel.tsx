"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface DeckPanelProps {
    requiresDeckList: boolean;
    setRequiresDeckList: (v: boolean) => void;
    deckSubmissionCutoffHours: string;
    setDeckSubmissionCutoffHours: (v: string) => void;
}

export function DeckPanel({
    requiresDeckList, setRequiresDeckList,
    deckSubmissionCutoffHours, setDeckSubmissionCutoffHours,
}: DeckPanelProps) {
    return (
        <div className="space-y-6">
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
    );
}
