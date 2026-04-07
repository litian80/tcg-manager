/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useTransition } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, FileText, History as HistoryIcon, Gavel, CheckCircle2, ChevronDown, ChevronUp, Edit, Trash2, ScrollText } from "lucide-react";
import { getPlayerJudgeDetails, addPenalty, addDeckCheck, updatePenalty, deletePenalty } from "@/actions/judge";
import { markPaperDecklist, unmarkPaperDecklist } from "@/actions/deck/paper-decklist";
import { DeckDisplay } from "@/components/tournament/DeckDisplay";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTime, formatTimeShort } from "@/lib/utils";

interface JudgePlayerDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    tournamentId: string;
    player: {
        id: string; // tom_player_id
        dbId?: string; // real db uuid
        name: string;
        record?: string;
    };
    roundNumber: number;
    canEditPenalties?: boolean;
    requiresDeckList?: boolean;
}

const CATEGORIES = [
    "Procedural Error",
    "Tardiness",
    "Unsporting Conduct",
    "Cheating",
    "Gameplay Error (TCG)",
    "Legality Check (Deck Legality)",
    "Pace of Play"
];

const SEVERITIES = ["Minor", "Major", "Severe"];

const getValidSeverities = (cat: string) => {
    if (!cat) return [];
    if (cat === "Cheating") return ["Severe"];
    if (cat === "Pace of Play") return ["Minor", "Severe"];
    return ["Minor", "Major", "Severe"];
};

const PENALTIES = [
    "Caution",
    "Warning",
    "Double Prize Card Penalty",
    "Quadruple Prize Card Penalty",
    "Game Loss",
    "Match Loss",
    "Disqualification"
];

export function JudgePlayerDetailModal({
    isOpen,
    onClose,
    tournamentId,
    player,
    roundNumber,
    canEditPenalties = false,
    requiresDeckList = false
}: JudgePlayerDetailModalProps) {
    const [activeTab, setActiveTab] = useState("actions");
    const [isLoading, setIsLoading] = useState(true);
    const [history, setHistory] = useState<{
        penalties: { id: string; category: string; severity: string; penalty: string; notes?: string; round_number: number; created_at: string; judge?: { first_name: string | null; last_name: string | null; nick_name: string | null; } | null }[];
        deckChecks: { id: string; check_time: string; note?: string; round_number: number; judge?: { first_name: string | null; last_name: string | null; nick_name: string | null; } | null }[];
        paperMeta?: { accepted_at: string; accepted_by_name: string } | null;
    }>({ penalties: [], deckChecks: [] });
    const [isPending, startTransition] = useTransition();
    const [deckStatus, setDeckStatus] = useState<'online' | 'paper' | 'missing'>('missing');
    const [paperLoading, setPaperLoading] = useState(false);

    // Action Modes
    const [actionMode, setActionMode] = useState<"none" | "penalty" | "check" | "edit_penalty">("none");
    const [editingPenaltyId, setEditingPenaltyId] = useState<string | null>(null);
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
    const [penaltyToDelete, setPenaltyToDelete] = useState<string | null>(null);

    // Penalty Form State
    const [pCategory, setCategory] = useState("");
    const [pSeverity, setSeverity] = useState("");
    const [pPenalty, setPenalty] = useState("");
    const [pNotes, setNotes] = useState("");
    const [pRound, setPRound] = useState(roundNumber); // Default to current round

    // Start with blank check note
    const [checkNote, setCheckNote] = useState("");

    // Load History + Deck Status
    const refreshData = async () => {
        setIsLoading(true);
        const data = await getPlayerJudgeDetails(tournamentId, player.id, player.dbId || player.id);
        setHistory(data);
        // Check deck status
        if (requiresDeckList && 'deckStatus' in data && data.deckStatus) {
            setDeckStatus(data.deckStatus as 'online' | 'paper' | 'missing');
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (isOpen) {
            refreshData();
            setActionMode("none"); // Reset action mode on open
            setEditingPenaltyId(null);
            setPRound(roundNumber); // Reset round on open
        }
    }, [isOpen, tournamentId, player.id, roundNumber]);

    // Smart Defaults Logic (Copy-pasted/Adapted)
    useEffect(() => {
        // Disable smart defaults while editing to prevent overwriting the existing penalty
        if (actionMode === "edit_penalty" || !pCategory) return;

        const validSeverities = getValidSeverities(pCategory);
        if (pSeverity && !validSeverities.includes(pSeverity)) {
            setTimeout(() => {
                setSeverity("");
                setPenalty("");
            }, 0);
            return;
        }

        let suggested = "";
        if (pCategory === "Cheating") suggested = "Disqualification";
        else if (pCategory === "Procedural Error") {
            if (pSeverity === "Minor") suggested = "Caution";
            else if (pSeverity === "Major") suggested = "Warning";
            else if (pSeverity === "Severe") suggested = "Game Loss";
        } else if (pCategory === "Tardiness") {
            if (pSeverity === "Minor") suggested = "Warning";
            else if (pSeverity === "Major") suggested = "Game Loss";
            else if (pSeverity === "Severe") suggested = "Match Loss";
        } else if (pCategory === "Unsporting Conduct") {
            if (pSeverity === "Minor") suggested = "Warning";
            else if (pSeverity === "Major") suggested = "Match Loss";
            else if (pSeverity === "Severe") suggested = "Disqualification";
        } else if (pCategory === "Gameplay Error (TCG)") {
            if (pSeverity === "Minor") suggested = "Warning";
            else if (pSeverity === "Major") suggested = "Double Prize Card Penalty";
            else if (pSeverity === "Severe") suggested = "Game Loss";
        } else if (pCategory === "Legality Check (Deck Legality)") {
            if (pSeverity === "Minor") suggested = "Warning";
            else if (pSeverity === "Major") suggested = "Game Loss";
            else if (pSeverity === "Severe") suggested = "Disqualification";
        } else if (pCategory === "Pace of Play") {
            if (pSeverity === "Minor") suggested = "Warning";
            else if (pSeverity === "Severe") suggested = "Double Prize Card Penalty";
        }
        if (suggested) {
            setTimeout(() => setPenalty(suggested), 0);
        }
    }, [pCategory, pSeverity]);

    const handleSubmitPenalty = async () => {
        if (!pCategory || !pSeverity || !pPenalty) {
            toast.error("Please fill required fields");
            return;
        }

        const formData = new FormData();
        formData.append("tournament_id", tournamentId);
        formData.append("player_id", player.id);
        formData.append("round_number", String(pRound)); // Use selected round
        formData.append("category", pCategory);
        formData.append("severity", pSeverity);
        formData.append("penalty", pPenalty);
        formData.append("notes", pNotes);

        startTransition(async () => {
            if (actionMode === "edit_penalty" && editingPenaltyId) {
                formData.append("penalty_id", editingPenaltyId);
                const res = await updatePenalty(formData);
                if (res.error) toast.error(res.error);
                else {
                    toast.success("Penalty Updated");
                    setActionMode("none");
                    setEditingPenaltyId(null);
                    setCategory(""); setSeverity(""); setPenalty(""); setNotes(""); setPRound(roundNumber);
                    setActiveTab("history");
                    refreshData();
                }
            } else {
                const res = await addPenalty(formData);
                if (res.error) toast.error(res.error);
                else {
                    toast.success("Penalty Issued");
                    setActionMode("none");
                    setCategory(""); setSeverity(""); setPenalty(""); setNotes(""); setPRound(roundNumber);
                    refreshData();
                }
            }
        });
    };

    const handleEditClick = (p: { id: string; category: string; severity: string; penalty: string; notes?: string; round_number: number }) => {
        setCategory(p.category);
        setSeverity(p.severity);
        setPenalty(p.penalty);
        setNotes(p.notes || "");
        setPRound(p.round_number);
        setEditingPenaltyId(p.id);
        setActionMode("edit_penalty");
        setActiveTab("actions");
    };

    const handleDeleteClick = (penaltyId: string) => {
        setPenaltyToDelete(penaltyId);
    };

    const confirmDeletePenalty = async () => {
        if (!penaltyToDelete) return;
        setIsDeletingId(penaltyToDelete);
        const penaltyId = penaltyToDelete;
        setPenaltyToDelete(null);

        startTransition(async () => {
            const res = await deletePenalty(penaltyId, tournamentId);
            if (res.error) toast.error(res.error);
            else {
                toast.success("Penalty Deleted");
                refreshData();
            }
            setIsDeletingId(null);
        });
    };

    const handleLogDeckCheck = async () => {
        const formData = new FormData();
        formData.append("tournament_id", tournamentId);
        formData.append("player_id", player.id);
        formData.append("round_number", String(roundNumber));
        formData.append("note", checkNote);

        startTransition(async () => {
            const res = await addDeckCheck(formData);
            if (res.error) toast.error(res.error);
            else {
                toast.success("Deck Check Logged");
                setActionMode("none");
                setCheckNote("");
                refreshData();
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md max-h-[90vh] max-sm:max-w-none max-sm:max-h-none max-sm:h-[100dvh] max-sm:w-[100vw] max-sm:rounded-none flex flex-col p-0 gap-0">
                {/* Header */}
                <div className="p-6 pb-4 border-b bg-muted/20">
                    <DialogHeader>
                        <DialogTitle className="text-xl">{player.name}</DialogTitle>
                        <DialogDescription className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="font-mono">ID: {player.id}</Badge>
                            {player.record && <span>{player.record}</span>}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                    <div className="px-6 pt-2">
                        <TabsList className="w-full grid grid-cols-3">
                            <TabsTrigger value="actions">Actions</TabsTrigger>
                            <TabsTrigger value="deck">Deck</TabsTrigger>
                            <TabsTrigger value="history">
                                History
                                {(history.penalties.length + history.deckChecks.length) > 0 && (
                                    <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                                        {history.penalties.length + history.deckChecks.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        <TabsContent value="actions" className="mt-0 space-y-6">

                            {/* Action Selection Buttons */}
                            {actionMode === "none" && (
                                <div className="grid gap-4">
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        className="h-24 text-lg font-medium flex flex-col gap-1 items-center justify-center bg-background border-border text-foreground hover:bg-muted hover:text-foreground"
                                        onClick={() => setActionMode("check")}
                                    >
                                        <CheckCircle2 className="w-8 h-8 mb-1 text-muted-foreground" />
                                        <span>Log Deck Check</span>
                                        <span className="text-xs font-normal text-muted-foreground opacity-80">Record a passed deck check</span>
                                    </Button>

                                    <Button
                                        variant="outline"
                                        size="lg"
                                        className="h-24 text-lg font-medium flex flex-col gap-1 items-center justify-center bg-white border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                                        onClick={() => setActionMode("penalty")}
                                    >
                                        <AlertCircle className="w-8 h-8 mb-1 text-red-500" />
                                        <span>Issue Penalty</span>
                                        <span className="text-xs font-normal text-red-600/70">Warning, Game Loss, etc.</span>
                                    </Button>

                                    {requiresDeckList && deckStatus !== 'online' && !isLoading && (
                                        <Button
                                            variant="outline"
                                            size="lg"
                                            className={deckStatus === 'paper'
                                                ? "h-24 text-lg font-medium flex flex-col gap-1 items-center justify-center bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                                                : "h-24 text-lg font-medium flex flex-col gap-1 items-center justify-center bg-background border-blue-200 text-blue-700 hover:bg-blue-50"
                                            }
                                            disabled={paperLoading}
                                            onClick={async () => {
                                                setPaperLoading(true);
                                                if (deckStatus === 'paper') {
                                                    const res = await unmarkPaperDecklist(tournamentId, player.id);
                                                    if (res.error) toast.error(res.error);
                                                    else { 
                                                        toast.success("Paper mark removed"); 
                                                        setDeckStatus('missing'); 
                                                        refreshData(); 
                                                    }
                                                } else {
                                                    const res = await markPaperDecklist(tournamentId, player.id);
                                                    if (res.error) toast.error(res.error);
                                                    else { 
                                                        toast.success("Paper decklist marked"); 
                                                        setDeckStatus('paper'); 
                                                        refreshData(); 
                                                    }
                                                }
                                                setPaperLoading(false);
                                            }}
                                        >
                                            <ScrollText className="w-8 h-8 mb-1 text-blue-500" />
                                            <span>{paperLoading ? "..." : deckStatus === 'paper' ? "Unmark Paper Decklist" : "Mark Paper Decklist"}</span>
                                            <span className="text-xs font-normal text-blue-600/70">
                                                {deckStatus === 'paper' ? "Remove paper submission mark" : "Player submitted a physical paper list"}
                                            </span>
                                        </Button>
                                    )}

                                    {deckStatus === 'paper' && history.paperMeta && (
                                        <div className="text-center text-xs text-muted-foreground mt-2 border border-blue-100 bg-blue-50/50 p-2 rounded">
                                            <div>Accepted by <strong>{history.paperMeta.accepted_by_name}</strong></div>
                                            <div>{formatDateTime(history.paperMeta.accepted_at)}</div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Deck Check Form */}
                            {actionMode === "check" && (
                                <div className="space-y-4 border rounded-lg p-4 bg-blue-50/50 dark:bg-blue-900/10">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold flex items-center gap-2">
                                            <CheckCircle2 className="w-5 h-5 text-blue-600" />
                                            Log Deck Check
                                        </h3>
                                        <Button variant="ghost" size="sm" onClick={() => setActionMode("none")}>Cancel</Button>
                                    </div>
                                    <Separator />

                                    <div className="space-y-2">
                                        <Label>Outcome</Label>
                                        <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-center font-medium border border-green-200 dark:border-green-800">
                                            Passed
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Note (Optional)</Label>
                                        <Input
                                            placeholder="e.g. Sleeves check, Mid-round check"
                                            value={checkNote}
                                            onChange={(e) => setCheckNote(e.target.value)}
                                        />
                                    </div>

                                    <Button className="w-full" onClick={handleLogDeckCheck} disabled={isPending}>
                                        {isPending ? "Saving..." : "Save Deck Check"}
                                    </Button>
                                </div>
                            )}

                            {/* Penalty Form */}
                            {(actionMode === "penalty" || actionMode === "edit_penalty") && (
                                <div className="space-y-4 border rounded-lg p-4 bg-red-50/50 dark:bg-red-900/10">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold flex items-center gap-2">
                                            <AlertCircle className="w-5 h-5 text-destructive" />
                                            {actionMode === "edit_penalty" ? "Edit Penalty" : "Issue Penalty"}
                                        </h3>
                                        <Button variant="ghost" size="sm" onClick={() => {
                                            setActionMode("none");
                                            setEditingPenaltyId(null);
                                        }}>Cancel</Button>
                                    </div>
                                    <Separator />

                                    <div className="space-y-3">
                                        <div className="grid gap-2">
                                            <Label>Round</Label>
                                            <Select
                                                value={String(pRound)}
                                                onValueChange={(val) => setPRound(Number(val))}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Round" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Array.from({ length: roundNumber }, (_, i) => i + 1).map((r) => (
                                                        <SelectItem key={r} value={String(r)}>
                                                            Round {r}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid gap-2">
                                            <Label>Category</Label>
                                            <Select value={pCategory} onValueChange={setCategory}>
                                                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                                <SelectContent>
                                                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid gap-2">
                                            <Label>Severity</Label>
                                            <Select value={pSeverity} onValueChange={setSeverity} disabled={!pCategory}>
                                                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                                <SelectContent>
                                                    {getValidSeverities(pCategory).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid gap-2">
                                            <Label>Penalty</Label>
                                            <Select value={pPenalty} onValueChange={setPenalty} disabled={!pCategory}>
                                                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                                <SelectContent>
                                                    {PENALTIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid gap-2">
                                            <Label>Notes</Label>
                                            <Textarea
                                                value={pNotes} onChange={e => setNotes(e.target.value)}
                                                placeholder="Details of infraction..."
                                            />
                                        </div>

                                        {/* Confirmation for Severe Penalties */}
                                        {(pPenalty === "Game Loss" || pPenalty === "Match Loss" || pPenalty === "Disqualification") && (
                                            <div className="p-3 bg-red-100 text-red-800 rounded text-sm mb-2 font-medium">
                                                Confirm issuance of {pPenalty}? This is a severe penalty.
                                            </div>
                                        )}

                                        <Button
                                            variant="destructive"
                                            className="w-full"
                                            onClick={handleSubmitPenalty}
                                            disabled={isPending}
                                        >
                                            {isPending ? "Saving..." : (actionMode === "edit_penalty" ? "Update Penalty" : "Issue Penalty")}
                                        </Button>
                                    </div>
                                </div>
                            )}

                        </TabsContent>

                        <TabsContent value="deck" className="mt-0">
                            <DeckDisplay tournamentId={tournamentId} playerId={player.id} />
                        </TabsContent>

                        <TabsContent value="history" className="mt-0">
                            {isLoading ? (
                                <div className="text-center py-8 text-muted-foreground">Loading history...</div>
                            ) : (history.penalties.length === 0 && history.deckChecks.length === 0 && !history.paperMeta) ? (
                                <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
                                    <HistoryIcon className="w-8 h-8 opacity-20" />
                                    <p>No history found for this tournament.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Paper Decklist History */}
                                    {history.paperMeta && (
                                        <div className="space-y-3">
                                            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Deck Submission</h4>
                                            <div className="border-l-4 border-blue-500 bg-muted/40 p-3 rounded-r text-sm">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-bold text-blue-700 dark:text-blue-400">PAPER DECKLIST</span>
                                                    <span className="text-xs text-muted-foreground">{formatTimeShort(history.paperMeta.accepted_at)}</span>
                                                </div>
                                                <div className="text-muted-foreground mt-1 text-xs">Accepted by {history.paperMeta.accepted_by_name}</div>
                                            </div>
                                        </div>
                                    )}
                                    {/* Penalties */}
                                    {history.penalties.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Penalties</h4>
                                            {history.penalties.map((p) => (
                                                <div key={p.id} className="border-l-4 border-destructive bg-muted/40 p-3 rounded-r text-sm">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="font-bold text-destructive">{p.penalty}</span>
                                                        <span className="text-xs text-muted-foreground">{formatTimeShort(p.created_at)} (R{p.round_number})</span>
                                                    </div>
                                                    <div className="font-medium">{p.category} - {p.severity}</div>
                                                    {p.notes && <div className="text-muted-foreground mt-1 text-xs italic">&quot;{p.notes}&quot;</div>}
                                                    <div className="text-[11px] text-muted-foreground mt-2 border-t border-destructive/10 pt-1 flex items-center gap-1 opacity-80">
                                                        <Gavel className="w-3 h-3 text-destructive/70" />
                                                        Issued by: {p.judge?.nick_name || (p.judge?.first_name ? `${p.judge.first_name} ${p.judge.last_name || ''}`.trim() : 'Unknown Judge')}
                                                    </div>
                                                    {canEditPenalties && (
                                                        <div className="mt-3 flex justify-end gap-2 border-t border-destructive/20 pt-2">
                                                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleEditClick(p)}>
                                                                <Edit className="w-3 h-3 mr-1" /> Edit
                                                            </Button>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50" 
                                                                onClick={() => handleDeleteClick(p.id)} 
                                                                disabled={isDeletingId === p.id}
                                                            >
                                                                <Trash2 className="w-3 h-3 mr-1" /> {isDeletingId === p.id ? "Deleting..." : "Delete"}
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Deck Checks */}
                                    {history.deckChecks.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Deck Checks</h4>
                                            {history.deckChecks.map((dc) => (
                                                <div key={dc.id} className="border-l-4 border-green-500 bg-muted/40 p-3 rounded-r text-sm">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="font-bold text-green-700 dark:text-green-400">PASSED</span>
                                                        <span className="text-xs text-muted-foreground">{formatTimeShort(dc.check_time)} (R{dc.round_number})</span>
                                                    </div>
                                                    {dc.note && <div className="text-muted-foreground mt-1 text-xs">{dc.note}</div>}
                                                    <div className="text-[11px] text-muted-foreground mt-2 border-t border-green-500/20 pt-1 flex items-center gap-1 opacity-80">
                                                        <CheckCircle2 className="w-3 h-3 text-green-600/70" />
                                                        Logged by: {dc.judge?.nick_name || (dc.judge?.first_name ? `${dc.judge.first_name} ${dc.judge.last_name || ''}`.trim() : 'Unknown Judge')}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </TabsContent>
                    </div>
                </Tabs>
            </DialogContent>

            <AlertDialog open={!!penaltyToDelete} onOpenChange={(open) => !open && setPenaltyToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Penalty</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this penalty? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeletePenalty} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog>
    );
}
