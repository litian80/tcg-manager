"use client";

import { Button } from "@/components/ui/button";
import { Download, Loader2, FileSpreadsheet } from "lucide-react";
import { generatePenaltyCSV } from "@/actions/tournament/reports";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

interface ExportPenaltyCardProps {
    tournamentId: string;
}

export function ExportPenaltyCard({ tournamentId }: ExportPenaltyCardProps) {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);
        const result = await generatePenaltyCSV(tournamentId);
        if (result.error) {
            toast.error(result.error);
        } else if (result.success) {
            const blob = new Blob([result.success], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `Penalty_Report_${tournamentId}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Penalty report exported successfully");
        }
        setIsExporting(false);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Export Penalty Report</CardTitle>
                <CardDescription>
                    Download a specialized CSV report of all penalties for submission.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-sm text-muted-foreground">
                    Includes Judge ID, Round, Severity, and Notes.
                </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
                <Button
                    variant="outline"
                    onClick={handleExport}
                    disabled={isExporting}
                    className="w-full sm:w-auto"
                >
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                    Download CSV
                </Button>
            </CardFooter>
        </Card>
    );
}
