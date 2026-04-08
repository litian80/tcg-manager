"use client";

import { useSyncExternalStore } from "react";
import { Globe } from "lucide-react";

function getTimezoneInfo(): { short: string; long: string; display: string } {
    try {
        const parts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(new Date());
        let tz = parts.find(part => part.type === 'timeZoneName')?.value || "";

        const longParts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'long' }).formatToParts(new Date());
        const longTz = longParts.find(part => part.type === 'timeZoneName')?.value || "";

        const ianaZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (ianaZone) {
            const city = ianaZone.split('/').pop()?.replace(/_/g, ' ');
            if (city) {
                tz = `${city} (${tz})`;
            }
        }

        return { short: tz, long: longTz, display: tz };
    } catch {
        return { short: "", long: "", display: "" };
    }
}

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function TimezoneIndicator() {
    const isMounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    if (!isMounted) {
        return <div className="h-6 w-16 invisible" />;
    }

    const { display, long: longTzName } = getTimezoneInfo();

    if (!display) {
        return <div className="h-6 w-16 invisible" />;
    }

    return (
        <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/50 text-secondary-foreground border border-border/50 shadow-sm cursor-help transition-colors hover:bg-secondary"
            title={longTzName ? `Your local timezone is ${longTzName}` : "Your local timezone"}
        >
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-medium tracking-wide">{display}</span>
        </div>
    );
}
