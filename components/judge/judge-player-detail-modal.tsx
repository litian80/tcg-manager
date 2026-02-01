"use client";

import { useState, useEffect, useTransition } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, FileText, History, Gavel, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { getPlayerJudgeDetails, addPenalty, addDeckCheck } from "@/actions/judge";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

interface JudgePlayerDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    tournamentId: string;
    player: {
        id: string; // tom_player_id
        name: string;
        record?: string;
    };
    roundNumber: number;
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
    roundNumber
}: JudgePlayerDetailModalProps) {
    const [activeTab, setActiveTab] = useState("actions");
    const [isLoading, setIsLoading] = useState(true);
    const [history, setHistory] = useState<{
        penalties: any[];
        deckChecks: any[];
    }>({ penalties: [], deckChecks: [] });
    const [isPending, startTransition] = useTransition();

    // Action Modes
    const [actionMode, setActionMode] = useState<"none" | "penalty" | "check">("none");

    // Penalty Form State
    const [pCategory, setCategory] = useState("");
    const [pSeverity, setSeverity] = useState("");
    const [pPenalty, setPenalty] = useState("");
    const [pNotes, setNotes] = useState("");
    const [pRound, setPRound] = useState(roundNumber); // Default to current round

    // Start with blank check note
    const [checkNote, setCheckNote] = useState("");

    // Load History
    const refreshData = async () => {
        setIsLoading(true);
        const data = await getPlayerJudgeDetails(tournamentId, player.id);
        setHistory(data);
        setIsLoading(false);
    };

    useEffect(() => {
        if (isOpen) {
            refreshData();
            setActionMode("none"); // Reset action mode on open
            setPRound(roundNumber); // Reset round on open
        }
    }, [isOpen, tournamentId, player.id, roundNumber]);

    // Smart Defaults Logic (Copy-pasted/Adapted)
    useEffect(() => {
        if (!pCategory) return;
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
        if (suggested) setPenalty(suggested);
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
            const res = await addPenalty(formData);
            if (res.error) toast.error(res.error);
            else {
                toast.success("Penalty Issued");
                setActionMode("none");
                setCategory(""); setSeverity(""); setPenalty(""); setNotes(""); setPRound(roundNumber);
                refreshData();
            }
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
            <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 gap-0">
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
                        <TabsList className="w-full grid grid-cols-2">
                            <TabsTrigger value="actions">Actions</TabsTrigger>
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

                    <ScrollArea className="flex-1 p-6">
                        <TabsContent value="actions" className="mt-0 space-y-6">

                            {/* Action Selection Buttons */}
                            {actionMode === "none" && (
                                <div className="grid gap-4">
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        className="h-24 text-lg font-medium flex flex-col gap-1 items-center justify-center bg-white border-gray-200 text-gray-900 hover:bg-gray-50 hover:text-gray-900"
                                        onClick={() => setActionMode("check")}
                                    >
                                        <CheckCircle2 className="w-8 h-8 mb-1 text-gray-500" />
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
                            {actionMode === "penalty" && (
                                <div className="space-y-4 border rounded-lg p-4 bg-red-50/50 dark:bg-red-900/10">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold flex items-center gap-2">
                                            <AlertCircle className="w-5 h-5 text-destructive" />
                                            Issue Penalty
                                        </h3>
                                        <Button variant="ghost" size="sm" onClick={() => setActionMode("none")}>Cancel</Button>
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
                                            <Select value={pSeverity} onValueChange={setSeverity}>
                                                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                                <SelectContent>
                                                    {SEVERITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid gap-2">
                                            <Label>Penalty</Label>
                                            <Select value={pPenalty} onValueChange={setPenalty}>
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
                                            {isPending ? "Issuing..." : "Issue Penalty"}
                                        </Button>
                                    </div>
                                </div>
                            )}

                        </TabsContent>

                        <TabsContent value="history" className="mt-0">
                            {isLoading ? (
                                <div className="text-center py-8 text-muted-foreground">Loading history...</div>
                            ) : (history.penalties.length === 0 && history.deckChecks.length === 0) ? (
                                <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
                                    <History className="w-8 h-8 opacity-20" />
                                    <p>No history found for this tournament.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Penalties */}
                                    {history.penalties.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Penalties</h4>
                                            {history.penalties.map((p) => (
                                                <div key={p.id} className="border-l-4 border-destructive bg-muted/40 p-3 rounded-r text-sm">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="font-bold text-destructive">{p.penalty}</span>
                                                        <span className="text-xs text-muted-foreground">{format(new Date(p.created_at), "HH:mm")} (R{p.round_number})</span>
                                                    </div>
                                                    <div className="font-medium">{p.category} - {p.severity}</div>
                                                    {p.notes && <div className="text-muted-foreground mt-1 text-xs italic">"{p.notes}"</div>}
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
                                                        <span className="text-xs text-muted-foreground">{format(new Date(dc.check_time), "HH:mm")} (R{dc.round_number})</span>
                                                    </div>
                                                    {dc.note && <div className="text-muted-foreground mt-1 text-xs">{dc.note}</div>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </TabsContent>
                    </ScrollArea>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
