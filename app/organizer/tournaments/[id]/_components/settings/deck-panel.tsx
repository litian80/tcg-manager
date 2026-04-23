"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { getListLabel } from "@/lib/utils";

interface DeckPanelProps {
    requiresDeckList: boolean;
    setRequiresDeckList: (v: boolean) => void;
    deckSubmissionCutoffHours: string;
    setDeckSubmissionCutoffHours: (v: string) => void;
    gameType?: string;
}

export function DeckPanel({
    requiresDeckList, setRequiresDeckList,
    deckSubmissionCutoffHours, setDeckSubmissionCutoffHours,
    gameType,
}: DeckPanelProps) {
    const listLabel = getListLabel(gameType);

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-medium">{listLabel} Settings</h3>

            <div className="flex items-center space-x-2 pb-2">
                <Checkbox
                    id="requires_deck_list"
                    checked={requiresDeckList}
                    onCheckedChange={(checked) => setRequiresDeckList(checked === true)}
                />
                <Label htmlFor="requires_deck_list">Require {listLabel} Submission</Label>
            </div>

            <div className="space-y-2">
                <Label htmlFor="deck_submission_cutoff_hours">
                    {listLabel} Submission Cutoff (Hours before start)
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
                        ? `Players must submit ${listLabel.toLowerCase()}s this many hours before the tournament starts. Set to 0 to disable deadlines.`
                        : `Enable ${listLabel.toLowerCase()} submission to configure deadlines.`}
                </p>
            </div>
        </div>
    );
}
