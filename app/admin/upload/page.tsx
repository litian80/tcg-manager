'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function UploadPage() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [isPublished, setIsPublished] = useState(true);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            setStatus('');
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setStatus('Please select a file first.');
            return;
        }

        setLoading(true);
        setStatus('Uploading...');

        try {
            const response = await fetch(`/api/upload-tom?published=${isPublished}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/xml',
                },
                body: file,
            });

            const result = await response.json();

            if (response.ok) {
                setStatus(`Success! Tournament ID: ${result.tournamentId}`);
            } else {
                setStatus(`Error: ${result.error} ${result.details ? JSON.stringify(result.details) : ''}`);
            }
        } catch (error) {
            setStatus('Network error occurred.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Upload TOM Tournament File (.tdf)</h1>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 text-gray-900">
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select .TDF File</label>
                    <input
                        type="file"
                        accept=".tdf"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
                    />
                </div>

                <div className="mb-6 flex items-center space-x-4">
                    <Switch
                        id="published-mode"
                        checked={isPublished}
                        onCheckedChange={setIsPublished}
                    />
                    <Label htmlFor="published-mode" className="flex flex-col">
                        <span>Publish Tournament</span>
                        <span className="font-normal text-xs text-muted-foreground">
                            If enabled, the tournament will be visible to players immediately.
                        </span>
                    </Label>
                </div>

                <button
                    onClick={handleUpload}
                    disabled={!file || loading}
                    className={`w-full py-2 px-4 rounded-md text-white font-medium 
                        ${!file || loading
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                        } transition-colors`}
                >
                    {loading ? 'Uploading...' : 'Upload Data'}
                </button>

                {status && (
                    <div className={`mt-4 p-3 rounded-md text-sm ${status.startsWith('Success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                        {status}
                    </div>
                )}
            </div>
        </div>
    );
}
