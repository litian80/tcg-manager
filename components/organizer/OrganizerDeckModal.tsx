"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { DeckDisplay } from "@/components/tournament/DeckDisplay";
import { Badge } from "@/components/ui/badge";

interface OrganizerDeckModalProps {
    isOpen: boolean;
    onClose: () => void;
    tournamentId: string;
    player: {
        id: string; // tom_player_id
        name: string;
    } | null;
}

export function OrganizerDeckModal({
    isOpen,
    onClose,
    tournamentId,
    player
}: OrganizerDeckModalProps) {
    if (!player) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 gap-0">
                <div className="p-6 pb-4 border-b bg-muted/20">
                    <DialogHeader>
                        <DialogTitle className="text-xl">{player.name}</DialogTitle>
                        <DialogDescription className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="font-mono">ID: {player.id}</Badge>
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="flex-1 overflow-y-auto p-6 pt-4">
                    <DeckDisplay tournamentId={tournamentId} playerId={player.id} />
                </div>
            </DialogContent>
        </Dialog>
    );
}
