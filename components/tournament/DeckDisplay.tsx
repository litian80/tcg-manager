"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, Info } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { getPlayerDeckList } from "@/actions/judge";
import { parseDeckList } from "@/utils/deck-validator";
import { CategorySection, PreviewCard } from "@/components/tournament/DeckSubmissionModal";

interface DeckDisplayProps {
    tournamentId: string;
    playerId: string; // tom_player_id
}

export function DeckDisplay({ tournamentId, playerId }: DeckDisplayProps) {
    const [deckListData, setDeckListData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchDeckList = async () => {
        setIsLoading(true);
        try {
            const res = await getPlayerDeckList(tournamentId, playerId);
            if (res.error) {
                toast.error(res.error);
            } else {
                setDeckListData(res.deckList);
            }
        } catch (error) {
            console.error("Error fetching deck list:", error);
            toast.error("Failed to load deck list");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDeckList();
    }, [tournamentId, playerId]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p>Loading deck list...</p>
            </div>
        );
    }

    if (!deckListData) {
        return (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
                <AlertCircle className="w-8 h-8 opacity-20" />
                <p>No deck list submitted yet.</p>
            </div>
        );
    }

    const parsed = parseDeckList(deckListData.raw_text);

    return (
        <div className="space-y-6">
            {/* Summary & Date */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                    <Badge variant={deckListData.validation_status === 'valid' ? 'default' : 'destructive'} 
                        className={deckListData.validation_status === 'valid' ? 'bg-green-600' : ''}>
                        {deckListData.validation_status?.toUpperCase() || 'UNKNOWN'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                        Submitted: {formatDateTime(deckListData.submitted_at)}
                    </span>
                </div>
                {deckListData.validation_errors && Array.isArray(deckListData.validation_errors) && deckListData.validation_errors.length > 0 && (
                    <div className="mt-2 p-2 bg-red-50 text-red-700 rounded text-xs border border-red-100">
                        <strong>Validation Errors:</strong>
                        <ul className="list-disc list-inside mt-1">
                            {deckListData.validation_errors.map((err: any, idx: number) => (
                                <li key={idx}>{err.message || err}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <Tabs defaultValue="structured" className="w-full h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="structured">Structured</TabsTrigger>
                    <TabsTrigger value="raw">Raw Text</TabsTrigger>
                </TabsList>
                
                <TabsContent value="structured" className="mt-4 flex-1">
                    <div className="h-[55vh] min-h-[400px]">
                        {/* Parsed List */}
                        <PreviewCard className="border-none shadow-none bg-muted/30 overflow-hidden h-full">
                            <ScrollArea className="h-full p-4">
                                {parsed ? (
                                    <div className="space-y-6 pb-6">
                                        <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border">
                                            <span className="font-semibold">Total Cards</span>
                                            <Badge variant="default" className="text-sm px-3 shadow-sm">
                                                {parsed.TotalCards} / 60
                                            </Badge>
                                        </div>
                                        <CategorySection title="Pokémon" cards={parsed.Pokemon || []} color="border-l-[4px] border-l-green-500" />
                                        <CategorySection title="Trainer" cards={parsed.Trainer || []} color="border-l-[4px] border-l-blue-500" />
                                        <CategorySection title="Energy" cards={parsed.Energy || []} color="border-l-[4px] border-l-amber-500" />
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2 py-20">
                                        <Info className="h-8 w-8" />
                                        <p>No parsed results.</p>
                                    </div>
                                )}
                            </ScrollArea>
                        </PreviewCard>
                    </div>
                </TabsContent>

                <TabsContent value="raw" className="mt-4">
                    <div className="relative">
                        <ScrollArea className="h-64 w-full border rounded-md p-3 bg-muted/30 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                            {deckListData.raw_text}
                        </ScrollArea>
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            className="absolute top-2 right-2 h-7 text-[10px]"
                            onClick={() => {
                                navigator.clipboard.writeText(deckListData.raw_text);
                                toast.success("Copied to clipboard");
                            }}
                        >
                            Copy
                        </Button>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
