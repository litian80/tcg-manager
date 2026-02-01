"use client";

import { useState, useEffect, useTransition } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateMatchTimeExtension } from "@/actions/judge";
import { toast } from "sonner";

interface TimeExtensionModalProps {
    isOpen: boolean;
    onClose: () => void;
    matchId: string;
    tableNumber: number;
    currentExtension: number;
}

export function TimeExtensionModal({
    isOpen,
    onClose,
    matchId,
    tableNumber,
    currentExtension
}: TimeExtensionModalProps) {
    const [extMinutes, setExtMinutes] = useState(currentExtension);
    const [isPending, startTransition] = useTransition();

    // Sync with prop changes - prepopulate with existing extension
    useEffect(() => {
        if (isOpen) {
            setExtMinutes(currentExtension);
        }
    }, [isOpen, currentExtension]);

    const handleUpdateExtension = async () => {
        startTransition(async () => {
            const res = await updateMatchTimeExtension(matchId, extMinutes);
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success("Time Extension Updated");
                onClose();
                // Trigger page refresh to show updated extension
                window.location.reload();
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">
                        Time Extension - Table {tableNumber}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="minutes" className="text-sm font-medium">
                            Extension (minutes)
                        </Label>
                        <Input
                            id="minutes"
                            type="number"
                            value={extMinutes}
                            onChange={(e) => setExtMinutes(Number(e.target.value))}
                            min="0"
                            className="text-base"
                            placeholder="0"
                            autoFocus
                        />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateExtension}
                            disabled={isPending}
                            className="flex-1"
                        >
                            {isPending ? "Saving..." : "Save"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
