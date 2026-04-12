"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Ban, Loader2 } from "lucide-react";
import { cancelTournament } from "@/actions/tournament/cancel";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface CancelTournamentButtonProps {
    tournamentId: string;
    tournamentName: string;
}

export function CancelTournamentButton({ tournamentId, tournamentName }: CancelTournamentButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const router = useRouter();

    const handleCancel = async () => {
        setIsLoading(true);
        const result = await cancelTournament(tournamentId);

        if (result.error) {
            toast.error(result.error);
            setIsLoading(false);
            setOpen(false);
            return;
        }

        toast.success("Tournament has been cancelled.");
        setOpen(false);
        router.refresh();
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                    <Ban className="w-4 h-4 mr-1.5" />
                    Cancel Tournament
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Tournament</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                        <span className="block">
                            Are you sure you want to cancel <strong>&ldquo;{tournamentName}&rdquo;</strong>?
                        </span>
                        <span className="block text-red-600 dark:text-red-400 font-medium">
                            This action is permanent and cannot be undone.
                        </span>
                        <span className="block">
                            Registration will be immediately closed and all tournament information will be locked in a read-only state.
                        </span>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>Keep Tournament</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            handleCancel();
                        }}
                        disabled={isLoading}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Yes, Cancel Tournament
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
