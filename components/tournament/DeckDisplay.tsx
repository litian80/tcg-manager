"use client";

import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, Info, Copy } from "lucide-react";
import { formatDateTime, cn } from "@/lib/utils";
import { toast } from "sonner";
import { getPlayerDeckList } from "@/actions/judge";
import { parseDeckList, mergeCards, sortCards } from "@/utils/deck-validator";
import { CategorySection } from "@/components/tournament/DeckSubmissionModal";
import { parseShowdownPaste } from "@/lib/vgc/parser";
import { calculateStats } from "@/lib/vgc/stat-calculator";
import type { ParsedCard } from "@/types/deck";
import type { VGCPokemon } from "@/lib/vgc/types";
import type { StatBlock } from "@/lib/vgc/types";

interface DeckDisplayProps {
    tournamentId: string;
    playerId: string; // tom_player_id
    isVGC?: boolean;
}


function PokemonCard({ pokemon, index }: { pokemon: VGCPokemon; index: number }) {
    const stats = calculateStats(pokemon);

    return (
        <div className="rounded-lg border bg-card p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono text-muted-foreground w-4 text-right">#{index + 1}</span>
                    <span className="font-semibold text-sm truncate">
                        {pokemon.nickname ? `${pokemon.nickname} (${pokemon.species})` : pokemon.species}
                    </span>
                    {pokemon.gender && (
                        <span className={cn("text-xs font-bold", pokemon.gender === "M" ? "text-blue-500" : "text-pink-500")}>
                            {pokemon.gender === "M" ? "♂" : "♀"}
                        </span>
                    )}
                    {pokemon.shiny && <span className="text-xs">✨</span>}
                </div>
                {pokemon.item && (
                    <Badge variant="outline" className="text-[10px] font-mono flex-shrink-0">
                        {pokemon.item}
                    </Badge>
                )}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span><strong>Ability:</strong> {pokemon.ability}</span>
                {pokemon.teraType && <span><strong>Tera:</strong> {pokemon.teraType}</span>}
                <span><strong>Lv:</strong> {pokemon.level}</span>
            </div>
            <div className="flex flex-wrap gap-1">
                {pokemon.moves.map((move, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] font-normal">{move}</Badge>
                ))}
            </div>
            {stats && (
                <div className="grid grid-cols-6 gap-1 mt-1 pt-1.5 border-t">
                    {(['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as (keyof StatBlock)[]).map(key => (
                        <div key={key} className="text-center">
                            <div className="text-[9px] font-medium text-muted-foreground uppercase">
                                {key === 'spa' ? 'SpA' : key === 'spd' ? 'SpD' : key === 'spe' ? 'Spe' : key.toUpperCase()}
                            </div>
                            <div className="text-xs font-mono font-semibold">{stats[key]}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export function DeckDisplay({ tournamentId, playerId, isVGC = false }: DeckDisplayProps) {
    const [deckListData, setDeckListData] = useState<any>(null);
    const [teamListData, setTeamListData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchDeckList = async () => {
        setIsLoading(true);
        try {
            const res = await getPlayerDeckList(tournamentId, playerId);
            if (res.error) {
                toast.error(res.error);
            } else {
                setDeckListData(res.deckList);
                setTeamListData(res.teamList);
            }
        } catch (error) {
            console.error("Error fetching deck/team list:", error);
            toast.error("Failed to load list");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDeckList();
    }, [tournamentId, playerId]);

    // Build a lookup map from DB card data: "name|set_code|card_number" → secondary_category
    const secondaryCategoryMap = useMemo(() => {
        const map = new Map<string, string>();
        if (!deckListData?.deck_list_cards) return map;
        for (const dlc of deckListData.deck_list_cards) {
            const card = dlc.cards;
            if (!card) continue;
            const setCode = card.sets?.code || '';
            const key = `${(card.name || '').toLowerCase()}|${setCode.toLowerCase()}|${card.card_number}`;
            if (card.secondary_category) {
                map.set(key, card.secondary_category);
            }
        }
        return map;
    }, [deckListData]);

    // Enrich parsed cards with secondaryCategory from DB lookup
    const enrichCards = (cards: ParsedCard[]): ParsedCard[] => {
        return cards.map(card => {
            const key = `${card.name.toLowerCase()}|${card.set.toLowerCase()}|${card.number}`;
            const secondaryCategory = secondaryCategoryMap.get(key);
            return secondaryCategory ? { ...card, secondaryCategory } : card;
        });
    };

    // Parse VGC team
    const parsedTeam = useMemo(() => {
        if (!teamListData?.raw_paste) return [];
        try {
            return parseShowdownPaste(teamListData.raw_paste).pokemon;
        } catch { return []; }
    }, [teamListData]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p>Loading {isVGC ? 'team' : 'deck'} list...</p>
            </div>
        );
    }

    // --- VGC Team Display ---
    if (isVGC) {
        if (!teamListData) {
            return (
                <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
                    <AlertCircle className="w-8 h-8 opacity-20" />
                    <p>No team list submitted yet.</p>
                </div>
            );
        }

        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Badge variant="default" className="bg-green-600">SUBMITTED</Badge>
                    <span className="text-xs text-muted-foreground">
                        Submitted: {formatDateTime(teamListData.submitted_at)}
                    </span>
                </div>

                {/* Game Profile Info (For Tournament Staff) */}
                {(teamListData.trainer_name || teamListData.battle_team_name || teamListData.switch_profile_name) && (
                    <div className="grid grid-cols-3 gap-2 p-2 rounded-md bg-muted/50 border text-xs">
                        {teamListData.trainer_name && (
                            <div>
                                <span className="text-muted-foreground">IGN:</span>{" "}
                                <span className="font-medium">{teamListData.trainer_name}</span>
                            </div>
                        )}
                        {teamListData.battle_team_name && (
                            <div>
                                <span className="text-muted-foreground">Battle Team:</span>{" "}
                                <span className="font-medium">{teamListData.battle_team_name}</span>
                            </div>
                        )}
                        {teamListData.switch_profile_name && (
                            <div>
                                <span className="text-muted-foreground">Switch Profile:</span>{" "}
                                <span className="font-medium">{teamListData.switch_profile_name}</span>
                            </div>
                        )}
                    </div>
                )}

                <Tabs defaultValue="structured" className="w-full h-full flex flex-col">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="structured">Structured</TabsTrigger>
                        <TabsTrigger value="raw">Raw Text</TabsTrigger>
                    </TabsList>

                    <TabsContent value="structured" className="mt-2 flex-1">
                        <div className="h-[55vh] min-h-[400px]">
                            <ScrollArea className="h-full px-2 py-1">
                                {parsedTeam.length > 0 ? (
                                    <div className="space-y-2 pb-4">
                                        <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border">
                                            <span className="font-semibold text-sm">Team Size</span>
                                            <Badge variant="default" className="text-sm px-3 shadow-sm">
                                                {parsedTeam.length} Pokémon
                                            </Badge>
                                        </div>
                                        {parsedTeam.map((pokemon, i) => (
                                            <PokemonCard key={i} pokemon={pokemon} index={i} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-12">
                                        Unable to parse team list.
                                    </div>
                                )}
                            </ScrollArea>
                        </div>
                    </TabsContent>

                    <TabsContent value="raw" className="mt-4 flex-1">
                        <div className="relative h-[55vh] min-h-[400px]">
                            <ScrollArea className="h-full w-full border rounded-md p-3 bg-muted/30 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                                {teamListData.raw_paste}
                            </ScrollArea>
                            <Button
                                variant="secondary"
                                size="sm"
                                className="absolute top-2 right-2 h-7 text-[10px] gap-1"
                                onClick={() => {
                                    navigator.clipboard.writeText(teamListData.raw_paste);
                                    toast.success("Copied to clipboard");
                                }}
                            >
                                <Copy className="h-3 w-3" />
                                Copy
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        );
    }

    // --- TCG Deck Display (original) ---
    if (!deckListData) {
        return (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
                <AlertCircle className="w-8 h-8 opacity-20" />
                <p>No deck list submitted yet.</p>
            </div>
        );
    }

    const parsed = parseDeckList(deckListData.raw_text);

    // Merge → Enrich with DB sub-types → Sort
    const pokemonCards = sortCards(enrichCards(mergeCards(parsed.Pokemon || [])), 'pokemon');
    const trainerCards = sortCards(enrichCards(mergeCards(parsed.Trainer || [])), 'trainer');
    const energyCards = sortCards(enrichCards(mergeCards(parsed.Energy || [])), 'energy');

    return (
        <div className="space-y-3">
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
                
                <TabsContent value="structured" className="mt-2 flex-1">
                    <div className="h-[55vh] min-h-[400px]">
                        <ScrollArea className="h-full px-2 py-1">
                            {parsed ? (
                                <div className="space-y-3 pb-4">
                                    <CategorySection title="Pokémon" cards={pokemonCards} color="border-l-[3px] border-l-green-500" />
                                    <CategorySection title="Trainer" cards={trainerCards} color="border-l-[3px] border-l-blue-500" />
                                    <CategorySection title="Energy" cards={energyCards} color="border-l-[3px] border-l-amber-500" />
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2 py-20">
                                    <Info className="h-8 w-8" />
                                    <p>No parsed results.</p>
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </TabsContent>

                <TabsContent value="raw" className="mt-4 flex-1">
                    <div className="relative h-[55vh] min-h-[400px]">
                        <ScrollArea className="h-full w-full border rounded-md p-3 bg-muted/30 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
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

