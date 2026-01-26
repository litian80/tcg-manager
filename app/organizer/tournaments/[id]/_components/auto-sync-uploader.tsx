'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UploadCloud, RefreshCw, StopCircle, FileText, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

declare global {
    interface Window {
        showOpenFilePicker: (options?: any) => Promise<FileSystemFileHandle[]>;
    }
}

interface AutoSyncUploaderProps {
    tournamentId?: string;
    isPublished?: boolean;
}

export function AutoSyncUploader({ tournamentId, isPublished = true }: AutoSyncUploaderProps) {
    const [isSupported, setIsSupported] = useState(true);
    const [handle, setHandle] = useState<FileSystemFileHandle | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [lastSynced, setLastSynced] = useState<Date | null>(null);
    const [isSyncing, setIsSyncing] = useState(false); // Visual syncing state
    const [isWatching, setIsWatching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Refs for polling and concurrency control
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const isSyncingRef = useRef(false); // Lock for concurrency
    const lastModifiedRef = useRef<number>(0);

    useEffect(() => {
        // Check browser support
        if (typeof window.showOpenFilePicker === 'undefined') {
            setIsSupported(false);
        }
    }, []);

    const stopWatching = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setIsWatching(false);
        // Don't clear handle, allow resuming? Or clear? 
        // Requirement says "Error Handling: Stop polling".
    };

    const performUpload = async (file: File) => {
        try {
            setIsSyncing(true);
            // Compatibility Note: The existing /api/upload-tom endpoint expects the raw XML body (req.text()).
            // Using FormData would break compatibility as the text parser would read the multipart boundary.
            // We send the file directly as the body, mirroring the logic in app/admin/upload/page.tsx.

            const response = await fetch(`/api/upload-tom?published=${isPublished}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/xml',
                },
                body: file,
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Upload failed');
            }

            setLastSynced(new Date());
            setError(null);
            toast.success('Tournament data synced');
        } catch (err: any) {
            console.error('Auto-sync error:', err);
            setError(err.message || 'Failed to sync');
            toast.error('Auto-sync failed: ' + (err.message || 'Unknown error'));
            // Optional: Stop watching on fatal error? For now, keep trying or let user stop.
        } finally {
            setIsSyncing(false);
        }
    };

    const startWatching = async () => {
        setError(null);
        try {
            const handles = await window.showOpenFilePicker({
                types: [
                    {
                        description: 'Tournament Data File',
                        accept: {
                            'text/xml': ['.tdf', '.xml'],
                        },
                    },
                ],
                multiple: false,
            });

            if (!handles || handles.length === 0) return;

            const fileHandle = handles[0];
            setHandle(fileHandle);

            const file = await fileHandle.getFile();
            setFileName(file.name);
            lastModifiedRef.current = file.lastModified;

            // Initial upload
            await performUpload(file);

            setIsWatching(true);

            // Start Polling
            intervalRef.current = setInterval(async () => {
                // Concurrency Lock
                if (isSyncingRef.current) return;

                try {
                    isSyncingRef.current = true;

                    // Check file
                    // Note: getFile() requires permission. If lost, it throws.
                    const currentFile = await fileHandle.getFile();

                    if (currentFile.lastModified > lastModifiedRef.current) {
                        console.log('File change detected, uploading...');
                        lastModifiedRef.current = currentFile.lastModified;
                        await performUpload(currentFile);
                    }
                } catch (err) {
                    console.error('Polling error:', err);
                    stopWatching();
                    setError('Lost access to file. Please select it again.');
                    toast.error('Sync stopped: Lost file access');
                } finally {
                    isSyncingRef.current = false;
                }
            }, 5000); // Poll every 5 seconds (more responsive than 10)

        } catch (err: any) {
            if (err.name !== 'AbortError') {
                setError('Failed to select file');
                console.error(err);
            }
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => stopWatching();
    }, []);

    if (!isSupported) {
        return (
            <Alert variant="default" className="bg-amber-50 border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Browser Not Supported</AlertTitle>
                <AlertDescription className="text-amber-700">
                    Auto-sync is only supported on Desktop Chrome, Edge, and Opera.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-4 p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
            <div className="flex flex-col space-y-2">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <RefreshCw className={cn("w-5 h-5", isWatching ? "text-green-500" : "text-muted-foreground")} />
                    Auto-Sync Uploader
                </h3>
                <p className="text-sm text-muted-foreground">
                    Automatically uploads changes when the TDF file is saved.
                    <br />
                    <span className="text-xs text-amber-600 font-medium">Warning: Refreshing the page stops the sync.</span>
                </p>
            </div>

            <div className="flex items-center gap-4">
                {!isWatching ? (
                    <Button onClick={startWatching} variant="default" className="gap-2">
                        <FileText className="w-4 h-4" />
                        Select TDF to Auto-Sync
                    </Button>
                ) : (
                    <Button onClick={stopWatching} variant="destructive" className="gap-2">
                        <StopCircle className="w-4 h-4" />
                        Stop Syncing
                    </Button>
                )}
            </div>

            {isWatching && (
                <div className="space-y-3 pt-2 border-t">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            <span className="text-sm font-medium text-green-700">Live Syncing</span>
                        </div>
                        {isSyncing && (
                            <Badge variant="outline" className="animate-pulse">Uploading...</Badge>
                        )}
                    </div>

                    <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">File:</span>
                            <span className="font-medium truncate max-w-[200px]" title={fileName || ''}>{fileName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Last synced:</span>
                            <span className="font-medium">
                                {lastSynced ? lastSynced.toLocaleTimeString() : 'Never'}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <Alert variant="destructive">
                    <AlertTitle>Sync Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
        </div>
    );
}
