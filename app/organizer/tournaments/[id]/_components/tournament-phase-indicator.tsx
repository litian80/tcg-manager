"use client";

import { cn } from "@/lib/utils";
import { ClipboardList, Radio, FlagTriangleRight } from "lucide-react";

interface TournamentPhaseIndicatorProps {
    isActive: boolean;
}

const phases = [
    { key: "pre", label: "Setup", icon: ClipboardList },
    { key: "during", label: "Live", icon: Radio },
    { key: "post", label: "Wrap-up", icon: FlagTriangleRight },
];

export function TournamentPhaseIndicator({ isActive }: TournamentPhaseIndicatorProps) {
    const currentIndex = isActive ? 1 : 0; // 0=pre, 1=during, 2=post

    return (
        <div className="flex items-center gap-1 sm:gap-2 py-2 px-3 bg-muted/50 rounded-lg w-fit" role="status" aria-label={`Tournament phase: ${phases[currentIndex].label}`}>
            {phases.map((phase, i) => {
                const Icon = phase.icon;
                const isCurrent = i === currentIndex;
                const isPast = i < currentIndex;

                return (
                    <div key={phase.key} className="flex items-center gap-1 sm:gap-2">
                        {i > 0 && (
                            <div className={cn(
                                "w-4 sm:w-8 h-px",
                                isPast || isCurrent ? "bg-primary" : "bg-border"
                            )} />
                        )}
                        <div className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors",
                            isCurrent && "bg-primary text-primary-foreground",
                            isPast && "text-primary",
                            !isCurrent && !isPast && "text-muted-foreground"
                        )}>
                            <Icon className={cn("w-3.5 h-3.5", isCurrent && i === 1 && "animate-pulse")} />
                            <span className="hidden sm:inline">{phase.label}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

