"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Users, Layers, CreditCard, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface DashboardWidgetsProps {
    registeredCount: number;
    capacity: number;           // 0 = unlimited
    decksSubmitted: number;
    decksRequired: number;      // total registered players (when deck lists required), 0 if not required
    pendingPayments: number;
    paymentRequired: boolean;
    startTime: string | null;
    deckDeadline: string | null;
}

function ProgressBar({ value, max, colorClass }: { value: number; max: number; colorClass: string }) {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-2">
            <div
                className={cn("h-full rounded-full transition-all duration-500", colorClass)}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}

function getCountdownText(startTime: string): { label: string; sub: string; urgent: boolean } {
    const now = new Date();
    const start = new Date(startTime);
    const diff = start.getTime() - now.getTime();

    if (diff <= 0) {
        return { label: "Started", sub: "Event is live", urgent: true };
    }

    const totalMinutes = Math.floor(diff / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (days > 0) {
        return {
            label: `${days}d ${remainingHours}h`,
            sub: format(start, "MMM d, h:mm a"),
            urgent: false,
        };
    }

    if (hours > 0) {
        return {
            label: `${hours}h ${minutes}m`,
            sub: format(start, "h:mm a"),
            urgent: hours < 2,
        };
    }

    return {
        label: `${minutes}m`,
        sub: "Starting soon",
        urgent: true,
    };
}

function getProgressColor(value: number, max: number): string {
    if (max === 0) return "bg-primary";
    const pct = value / max;
    if (pct >= 1) return "bg-green-500";
    if (pct >= 0.75) return "bg-amber-500";
    return "bg-primary";
}

export function DashboardWidgets({
    registeredCount,
    capacity,
    decksSubmitted,
    decksRequired,
    pendingPayments,
    paymentRequired,
    startTime,
    deckDeadline,
}: DashboardWidgetsProps) {
    const countdown = startTime ? getCountdownText(startTime) : null;

    const capacityColor = capacity > 0
        ? (registeredCount >= capacity ? "bg-red-500" : registeredCount >= capacity * 0.9 ? "bg-amber-500" : "bg-primary")
        : "bg-primary";

    const deckColor = decksRequired > 0 ? getProgressColor(decksSubmitted, decksRequired) : "bg-muted-foreground/30";

    return (
        <div className={cn(
            "grid grid-cols-2 gap-3",
            paymentRequired ? "lg:grid-cols-4" : "lg:grid-cols-3"
        )}>
            {/* Players */}
            <Card>
                <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Users className="h-4 w-4" />
                        <span className="text-xs font-medium uppercase tracking-wide">Players</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold tabular-nums">{registeredCount}</span>
                        {capacity > 0 && (
                            <span className="text-sm text-muted-foreground">/ {capacity}</span>
                        )}
                    </div>
                    {capacity > 0 ? (
                        <ProgressBar value={registeredCount} max={capacity} colorClass={capacityColor} />
                    ) : (
                        <p className="text-xs text-muted-foreground mt-1">No cap set</p>
                    )}
                </CardContent>
            </Card>

            {/* Deck Lists */}
            <Card className={decksRequired === 0 ? "opacity-50" : ""}>
                <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Layers className="h-4 w-4" />
                        <span className="text-xs font-medium uppercase tracking-wide">Deck Lists</span>
                    </div>
                    {decksRequired > 0 ? (
                        <>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-bold tabular-nums">{decksSubmitted}</span>
                                <span className="text-sm text-muted-foreground">/ {decksRequired}</span>
                            </div>
                            <ProgressBar value={decksSubmitted} max={decksRequired} colorClass={deckColor} />
                            {deckDeadline && (
                                <p className="text-xs text-muted-foreground mt-1.5">
                                    Due {format(new Date(deckDeadline), "MMM d, h:mm a")}
                                </p>
                            )}
                        </>
                    ) : (
                        <>
                            <span className="text-2xl font-bold text-muted-foreground">—</span>
                            <p className="text-xs text-muted-foreground mt-1">Not required</p>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Payments — only shown when online payment is configured */}
            {paymentRequired && (
                <Card>
                    <CardContent className="pt-4 pb-3 px-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <CreditCard className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase tracking-wide">Payments</span>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            {pendingPayments > 0 ? (
                                <>
                                    <span className="text-2xl font-bold tabular-nums text-amber-500">{pendingPayments}</span>
                                    <span className="text-sm text-muted-foreground">pending</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-2xl font-bold tabular-nums text-green-500">✓</span>
                                    <span className="text-sm text-muted-foreground">All clear</span>
                                </>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {pendingPayments > 0 ? "Awaiting payment confirmation" : "No outstanding payments"}
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Countdown */}
            <Card>
                <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Clock className={cn("h-4 w-4", countdown?.urgent && "text-red-500 animate-pulse")} />
                        <span className="text-xs font-medium uppercase tracking-wide">Starts In</span>
                    </div>
                    {countdown ? (
                        <>
                            <span className={cn(
                                "text-2xl font-bold tabular-nums",
                                countdown.urgent && "text-red-500"
                            )}>
                                {countdown.label}
                            </span>
                            <p className="text-xs text-muted-foreground mt-1">{countdown.sub}</p>
                        </>
                    ) : (
                        <>
                            <span className="text-2xl font-bold text-muted-foreground">—</span>
                            <p className="text-xs text-muted-foreground mt-1">No start time set</p>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
