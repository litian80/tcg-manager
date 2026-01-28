"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { addPenalty } from "@/actions/judge";
import { toast } from "sonner";

interface PenaltyModalProps {
    isOpen: boolean;
    onClose: () => void;
    tournamentId: string;
    playerId: string;
    playerName: string;
    roundNumber: number;
}

const CATEGORIES = [
    "Procedural Error",
    "Tardiness",
    "Unsporting Conduct",
    "Cheating",
    "Gameplay Error (TCG)",
    "Legality Check (Deck Legality)",
    "Pace of Play"
];

const SEVERITIES = ["Minor", "Major", "Severe"];

const PENALTIES = [
    "Caution",
    "Warning",
    "Double Prize Card Penalty",
    "Quadruple Prize Card Penalty",
    "Game Loss",
    "Match Loss",
    "Disqualification"
];

export function PenaltyModal({
    isOpen,
    onClose,
    tournamentId,
    playerId,
    playerName,
    roundNumber
}: PenaltyModalProps) {
    const [category, setCategory] = useState<string>("");
    const [severity, setSeverity] = useState<string>("");
    const [penalty, setPenalty] = useState<string>("");
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Smart Pre-population Logic
    useEffect(() => {
        if (!category) return;

        let suggestedPenalty = "";

        if (category === "Cheating") {
            suggestedPenalty = "Disqualification";
        } else if (category === "Procedural Error") {
            if (severity === "Minor") suggestedPenalty = "Caution";
            else if (severity === "Major") suggestedPenalty = "Warning";
            else if (severity === "Severe") suggestedPenalty = "Game Loss";
        } else if (category === "Tardiness") {
            if (severity === "Minor") suggestedPenalty = "Warning";
            else if (severity === "Major") suggestedPenalty = "Game Loss";
            else if (severity === "Severe") suggestedPenalty = "Match Loss";
        } else if (category === "Unsporting Conduct") {
            if (severity === "Minor") suggestedPenalty = "Warning";
            else if (severity === "Major") suggestedPenalty = "Match Loss";
            else if (severity === "Severe") suggestedPenalty = "Disqualification";
        } else if (category === "Gameplay Error (TCG)") {
            if (severity === "Minor") suggestedPenalty = "Warning";
            else if (severity === "Major") suggestedPenalty = "Double Prize Card Penalty";
            else if (severity === "Severe") suggestedPenalty = "Game Loss";
        } else if (category === "Legality Check (Deck Legality)") {
            if (severity === "Minor") suggestedPenalty = "Warning";
            else if (severity === "Major") suggestedPenalty = "Game Loss";
            else if (severity === "Severe") suggestedPenalty = "Disqualification";
        } else if (category === "Pace of Play") {
            if (severity === "Minor") suggestedPenalty = "Warning";
            else if (severity === "Severe") suggestedPenalty = "Double Prize Card Penalty";
        }

        if (suggestedPenalty) {
            setPenalty(suggestedPenalty);
        }
    }, [category, severity]);

    const handleSubmit = async () => {
        if (!category || !severity || !penalty) {
            toast.error("Please fill in all required fields.");
            return;
        }

        setIsSubmitting(true);

        const formData = new FormData();
        formData.append("tournament_id", tournamentId);
        formData.append("player_id", playerId);
        formData.append("round_number", String(roundNumber));
        formData.append("category", category);
        formData.append("severity", severity);
        formData.append("penalty", penalty);
        formData.append("notes", notes);

        try {
            const result = await addPenalty(formData);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Penalty added successfully");
                onClose();
                // Reset form
                setCategory("");
                setSeverity("");
                setPenalty("");
                setNotes("");
            }
        } catch (error) {
            toast.error("Failed to add penalty");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Penalty for {playerName}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Round</Label>
                        <div className="col-span-3 font-medium">
                            {roundNumber} (Current)
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="category" className="text-right">
                            Category
                        </Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORIES.map((c) => (
                                    <SelectItem key={c} value={c}>
                                        {c}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="severity" className="text-right">
                            Severity
                        </Label>
                        <Select value={severity} onValueChange={setSeverity}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select Severity" />
                            </SelectTrigger>
                            <SelectContent>
                                {SEVERITIES.map((s) => (
                                    <SelectItem key={s} value={s}>
                                        {s}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="penalty" className="text-right">
                            Penalty
                        </Label>
                        <Select value={penalty} onValueChange={setPenalty}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select Penalty" />
                            </SelectTrigger>
                            <SelectContent>
                                {PENALTIES.map((p) => (
                                    <SelectItem key={p} value={p}>
                                        {p}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="notes" className="text-right">
                            Notes
                        </Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="col-span-3"
                            placeholder="Details of the infraction..."
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? "Saving..." : "Add Penalty"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
