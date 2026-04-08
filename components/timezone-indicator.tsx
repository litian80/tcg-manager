"use client";

import { useEffect, useState } from "react";
import { Globe } from "lucide-react";

export function TimezoneIndicator() {
    const [isMounted, setIsMounted] = useState(false);
    const [tzName, setTzName] = useState("");
    const [longTzName, setLongTzName] = useState("");

    useEffect(() => {
        setIsMounted(true);
        try {
            // Get standard names
            const parts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(new Date());
            let tz = parts.find(part => part.type === 'timeZoneName')?.value || "";
            
            const longParts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'long' }).formatToParts(new Date());
            const longTz = longParts.find(part => part.type === 'timeZoneName')?.value;
            if (longTz) setLongTzName(longTz);

            // Attempt to get clear descriptive name like "Auckland (GMT+12)" or "New York (EST)"
            const ianaZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (ianaZone) {
                // e.g. "Pacific/Auckland" -> "Auckland"
                const city = ianaZone.split('/').pop()?.replace(/_/g, ' ');
                if (city) {
                    // Try to avoid redundant GMT+12 (GMT+12)
                    if (tz.startsWith('GMT') || tz.startsWith('UTC')) {
                        tz = `${city} (${tz})`;
                    } else {
                        tz = `${city} (${tz})`;
                    }
                }
            }
            
            setTzName(tz);
        } catch (e) {
            // fallback
        }
    }, []);

    if (!isMounted || !tzName) {
        return <div className="h-6 w-16 invisible" />; // Placeholder to avoid layout shift
    }

    return (
        <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/50 text-secondary-foreground border border-border/50 shadow-sm cursor-help transition-colors hover:bg-secondary"
            title={longTzName ? `Your local timezone is ${longTzName}` : "Your local timezone"}
        >
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-medium tracking-wide">{tzName}</span>
        </div>
    );
}
