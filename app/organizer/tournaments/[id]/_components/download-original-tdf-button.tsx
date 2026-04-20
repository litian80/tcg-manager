"use client";

import { Button } from "@/components/ui/button";
import { Archive, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface DownloadOriginalTdfButtonProps {
    tournamentId: string;
}

export function DownloadOriginalTdfButton({ tournamentId }: DownloadOriginalTdfButtonProps) {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const response = await fetch(`/api/tournaments/${tournamentId}/download-tdf`);

            if (!response.ok) {
                const result = await response.json();
                toast.error(result.error || 'Failed to download TDF');
                return;
            }

            // Extract filename from Content-Disposition header
            const disposition = response.headers.get('Content-Disposition');
            const filenameMatch = disposition?.match(/filename="(.+)"/);
            const filename = filenameMatch?.[1] || 'tournament.tdf';

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success('Original TDF file downloaded');
        } catch (err) {
            toast.error('Failed to download TDF file');
            console.error(err);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={isDownloading}
            title="Download the original TDF file uploaded from TOM"
        >
            {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <Archive className="w-4 h-4" />
            )}
            Original TDF
        </Button>
    );
}
