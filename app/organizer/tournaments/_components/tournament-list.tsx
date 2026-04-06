"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Search, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDate, getTournamentStatusConfig } from "@/lib/utils";
import type { Tournament } from "@/types/tournament";

type StatusFilter = "all" | "running" | "completed";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "running", label: "Active" },
    { value: "completed", label: "Completed" },
];

interface TournamentListProps {
    tournaments: Tournament[];
}

export function TournamentList({ tournaments }: TournamentListProps) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [showAllCompleted, setShowAllCompleted] = useState(false);

    const COLLAPSED_LIMIT = 5;

    // Filter
    const filtered = tournaments.filter((t) => {
        // Status filter
        if (statusFilter !== "all" && t.status !== statusFilter) return false;

        // Search filter
        if (search.trim()) {
            const q = search.toLowerCase();
            const nameMatch = t.name.toLowerCase().includes(q);
            const cityMatch = (t.city || "").toLowerCase().includes(q);
            const sanctionMatch = (t.tom_uid || "").toLowerCase().includes(q);
            if (!nameMatch && !cityMatch && !sanctionMatch) return false;
        }

        return true;
    });

    // Group by status
    const active = filtered.filter((t) => t.status === "running");
    const completed = filtered.filter((t) => t.status === "completed");

    // When status filter is specific, skip grouping
    const showGrouped = statusFilter === "all" && (active.length > 0 && completed.length > 0);

    const visibleCompleted = showAllCompleted
        ? completed
        : completed.slice(0, COLLAPSED_LIMIT);
    const hasMoreCompleted = completed.length > COLLAPSED_LIMIT;

    return (
        <div className="space-y-5">
            {/* Search + Status Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, city, or sanction ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="flex rounded-lg border bg-muted/50 p-0.5">
                    {STATUS_TABS.map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => {
                                setStatusFilter(tab.value);
                                setShowAllCompleted(false);
                            }}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                statusFilter === tab.value
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results */}
            {filtered.length === 0 ? (
                <div className="text-center py-12 border rounded-lg bg-muted/50">
                    <p className="text-muted-foreground">
                        {tournaments.length === 0
                            ? "No tournaments found. Create your first tournament to get started."
                            : "No tournaments match your search."}
                    </p>
                </div>
            ) : showGrouped ? (
                <>
                    {/* Active Section */}
                    <Section title="Active" count={active.length}>
                        {active.map((t) => (
                            <TournamentCard key={t.id} tournament={t} />
                        ))}
                    </Section>

                    {/* Completed Section */}
                    <Section title="Completed" count={completed.length}>
                        {visibleCompleted.map((t) => (
                            <TournamentCard key={t.id} tournament={t} />
                        ))}
                        {hasMoreCompleted && !showAllCompleted && (
                            <button
                                onClick={() => setShowAllCompleted(true)}
                                className="w-full flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground border border-dashed rounded-lg transition-colors"
                            >
                                <ChevronDown className="h-4 w-4" />
                                Show all {completed.length} completed
                            </button>
                        )}
                    </Section>
                </>
            ) : (
                <div className="grid gap-3">
                    {filtered.map((t) => (
                        <TournamentCard key={t.id} tournament={t} />
                    ))}
                </div>
            )}
        </div>
    );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h2>
                <Badge variant="secondary" className="text-xs tabular-nums">{count}</Badge>
            </div>
            <div className="grid gap-3">
                {children}
            </div>
        </div>
    );
}

function TournamentCard({ tournament }: { tournament: Tournament }) {
    const config = getTournamentStatusConfig(tournament.status);

    return (
        <Card className="hover:bg-accent/50 transition-colors">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{tournament.name}</CardTitle>
                    <Badge variant={config.variant} className={config.className}>
                        {config.label}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-sm">
                            {formatDate(tournament.date)} • {tournament.city || "No location"}
                        </p>
                        {tournament.tom_uid && (
                            <p className="text-xs text-green-600">
                                Sanction ID: {tournament.tom_uid}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href={`/tournament/${tournament.id}`}>
                            <Button variant="outline" size="sm">View Public</Button>
                        </Link>
                        <Link href={`/organizer/tournaments/new?duplicate=${tournament.id}`}>
                            <Button variant="outline" size="sm" title="Duplicate tournament">
                                <Copy className="h-4 w-4" />
                            </Button>
                        </Link>
                        <Link href={`/organizer/tournaments/${tournament.id}`}>
                            <Button size="sm">Manage</Button>
                        </Link>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
