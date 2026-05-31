'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UploadCloud, RefreshCw, StopCircle, FileText, AlertTriangle, CheckCircle2, WifiOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn, formatTimeShort } from '@/lib/utils';
import { toast } from 'sonner';

const MAX_CONSECUTIVE_FAILURES = 3;

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
    const [errorKind, setErrorKind] = useState<'transient' | 'permanent' | null>(null);
    const [consecutiveFailures, setConsecutiveFailures] = useState(0);

    // Refs for polling and concurrency control
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const isSyncingRef = useRef(false); // Lock for concurrency
    const lastModifiedRef = useRef<number>(0);
    const consecutiveFailuresRef = useRef(0);

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

    const performUpload = async (file: File): Promise<'success' | 'transient' | 'permanent'> => {
        try {
            setIsSyncing(true);
            // Compatibility Note: The existing /api/upload-tom endpoint expects the raw XML body (req.text()).
            // Using FormData would break compatibility as the text parser would read the multipart boundary.
            // We send the file directly as the body, mirroring the logic in app/admin/upload/page.tsx.

            const targetQuery = tournamentId ? `&targetId=${tournamentId}` : '';
            let response: Response;
            try {
                response = await fetch(`/api/upload-tom?published=${isPublished}${targetQuery}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/xml',
                    },
                    body: file,
                });
            } catch (fetchErr: any) {
                // Network-level failure (offline, DNS, connection refused)
                console.warn('Auto-sync network error:', fetchErr.message);
                return 'transient';
            }

            if (!response.ok) {
                let errorMsg = 'Upload failed';
                try {
                    const result = await response.json();
                    errorMsg = result.error || errorMsg;
                } catch {
                    // Response body wasn't JSON (e.g. Vercel timeout HTML page)
                    errorMsg = `Server error (HTTP ${response.status})`;
                }

                // DB-003: Stop auto-sync on TDF mismatch (400) — the file belongs to a different tournament
                if (response.status === 400 && errorMsg.includes('mismatch')) {
                    stopWatching();
                    setError('⚠️ Wrong TDF file: ' + errorMsg);
                    setErrorKind('permanent');
                    toast.error('Auto-sync stopped: TDF file does not match this tournament. Please select the correct file.');
                    return 'permanent';
                }

                // 4xx = permanent (auth, validation); 5xx = transient (server/network)
                if (response.status >= 400 && response.status < 500) {
                    setError(errorMsg);
                    setErrorKind('permanent');
                    toast.error(errorMsg);
                    return 'permanent';
                }

                // 5xx — treat as transient
                console.warn(`Auto-sync server error (${response.status}):`, errorMsg);
                return 'transient';
            }

            setLastSynced(new Date());
            setError(null);
            setErrorKind(null);
            consecutiveFailuresRef.current = 0;
            setConsecutiveFailures(0);
            toast.success('Tournament data synced');
            return 'success';
        } catch (err: any) {
            console.error('Auto-sync unexpected error:', err);
            return 'transient';
        } finally {
            setIsSyncing(false);
        }
    };

    /** Wrapper that handles retry logic around performUpload */
    const uploadWithRetry = async (file: File) => {
        const result = await performUpload(file);

        if (result === 'success') return;
        if (result === 'permanent') return; // Already handled above

        // Transient failure — track consecutive failures
        consecutiveFailuresRef.current += 1;
        setConsecutiveFailures(consecutiveFailuresRef.current);

        if (consecutiveFailuresRef.current >= MAX_CONSECUTIVE_FAILURES) {
            // Too many consecutive failures — surface the error
            setError('Sync failed after multiple retries. Check your internet connection and try again.');
            setErrorKind('transient');
            toast.error('Auto-sync: multiple consecutive failures. Will keep retrying...');
        } else {
            // Show a subtle warning but keep syncing
            setError(`Sync hiccup — retrying... (${consecutiveFailuresRef.current}/${MAX_CONSECUTIVE_FAILURES})`);
            setErrorKind('transient');
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
            await uploadWithRetry(file);

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
                        await uploadWithRetry(currentFile);
                    }
                } catch (err) {
                    console.error('Polling error:', err);
                    stopWatching();
                    setError('Lost access to file. Please select it again.');
                    setErrorKind('permanent');
                    toast.error('Sync stopped: Lost file access');
                } finally {
                    isSyncingRef.current = false;
                }
            }, 5000); // Poll every 5 seconds (more responsive than 10)

        } catch (err: any) {
            if (err.name !== 'AbortError') {
                setError('Failed to select file');
                setErrorKind('permanent');
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
                        {isSyncing ? (
                            <Badge variant="outline" className="animate-pulse">Uploading...</Badge>
                        ) : lastSynced ? (
                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Synced
                            </Badge>
                        ) : null}
                    </div>

                    <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">File:</span>
                            <span className="font-medium truncate max-w-[200px]" title={fileName || ''}>{fileName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Last synced:</span>
                            <span className="font-medium">
                                {lastSynced ? formatTimeShort(lastSynced) : 'Never'}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {error && errorKind === 'transient' && (
                <Alert className="bg-amber-50 border-amber-200">
                    <WifiOff className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800">Connection Issue</AlertTitle>
                    <AlertDescription className="text-amber-700">
                        {error}
                        {isWatching && <span className="block text-xs mt-1">Sync is still active and will recover automatically.</span>}
                    </AlertDescription>
                </Alert>
            )}

            {error && errorKind === 'permanent' && (
                <Alert variant="destructive">
                    <AlertTitle>Sync Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
        </div>
    );
}
