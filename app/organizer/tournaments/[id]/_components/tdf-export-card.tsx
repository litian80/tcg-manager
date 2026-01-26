"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { exportTournamentTDF } from "@/actions/export-tdf";

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
        try {
            const { xml, filename } = await exportTournamentTDF(tournament.id);
            console.log("TDF XML Received:", xml);

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

            toast.success("TDF file exported successfully");
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to export TDF file");
        } finally {
            setIsExporting(false);
        }
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
                <Button
                    onClick={handleExport}
                    disabled={!tournament.tom_uid || isExporting}
                    className="w-full sm:w-auto"
                >
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                    Download .tdf File
                </Button>
            </CardFooter>
        </Card>
    );
}
