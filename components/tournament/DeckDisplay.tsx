"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { getPlayerDeckList } from "@/actions/judge";
import { parseDeckList } from "@/utils/deck-validator";

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

            <Tabs defaultValue="structured" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="structured">Structured</TabsTrigger>
                    <TabsTrigger value="raw">Raw Text</TabsTrigger>
                </TabsList>
                
                <TabsContent value="structured" className="mt-4 space-y-4">
                    <div className="space-y-4 text-sm">
                        {(['Pokemon', 'Trainer', 'Energy'] as const).map(category => (
                            parsed[category].length > 0 && (
                                <div key={category} className="space-y-1">
                                    <h5 className="font-bold border-b pb-1 text-xs uppercase tracking-wider text-muted-foreground">{category} ({parsed[category].length})</h5>
                                    {parsed[category].map((card, i) => (
                                        <div key={i} className="flex justify-between py-1 border-b border-muted last:border-0 hover:bg-muted/30 px-1 rounded transition-colors">
                                            <span className="font-medium mr-2">{card.qty}x {card.name}</span>
                                            {category === 'Pokemon' && (
                                                <span className="text-muted-foreground text-xs font-mono">{card.set} {card.number}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )
                        ))}
                        <div className="pt-2 text-right font-bold text-sm">
                            Total Cards: {parsed.TotalCards}
                        </div>
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
