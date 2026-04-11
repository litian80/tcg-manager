"use client";

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { exportTournamentTDF } from "@/actions/tournament/export-tdf";

interface TdfExportCardProps {
    tournament: {
        id: string;
        tom_uid: string | null;
    };
}

export function TdfExportCard({ tournament }: TdfExportCardProps) {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);
        const result = await exportTournamentTDF(tournament.id);
        if (result.error) {
            toast.error(result.error);
        } else if (result.success) {
            const { xml, filename, warning } = result.success;

            // Trigger download
            const blob = new Blob([xml], { type: "application/octet-stream" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            if (warning) {
                toast.warning(warning, { duration: 10000 });
            } else {
                toast.success("TDF file exported successfully");
            }
        }
        setIsExporting(false);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Export Tournament File</CardTitle>
                <CardDescription>
                    Generate a .tdf file compatible with Tournament Operations Manager (TOM).
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-sm text-muted-foreground">
                    Ensure all players are registered and the Sanction ID is set before exporting.
                </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            disabled={!tournament.tom_uid || isExporting}
                            className="w-full sm:w-auto"
                        >
                            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                            Download .tdf File
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Roster Cutoff</AlertDialogTitle>
                            <AlertDialogDescription className="text-foreground">
                                You are exporting the player roster to TOM. By proceeding, you acknowledge that online registration is now closed, and BracketOps will only be updated via TOM syncs from this point forward.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleExport}>
                                Export
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
        </Card>
    );
}
