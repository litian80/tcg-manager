"use client";

import { useSyncExternalStore } from "react";
import { formatDate, formatDateTime, formatDateTimeCompact, formatTime, formatTimeShort } from "@/lib/utils";

function getTimezone(): string {
    try {
        const parts = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).formatToParts(new Date());
        return parts.find(part => part.type === 'timeZoneName')?.value || "";
    } catch {
        return "";
    }
}

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

interface ClientTimeProps {
    date: string | Date;
    formatType?: "date" | "datetime" | "datetimeCompact" | "time" | "timeShort";
    className?: string;
    fallback?: string;
}

export function ClientTime({ date, formatType = "timeShort", className, fallback = "...", showTimezone = false }: ClientTimeProps & { showTimezone?: boolean }) {
    const isMounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    if (!isMounted) {
        return <span className={className}>{fallback}</span>;
    }

    const tzName = getTimezone();

    let formatted = "";
    switch (formatType) {
        case "date":
            formatted = formatDate(date);
            break;
        case "datetime":
            formatted = formatDateTime(date);
            break;
        case "datetimeCompact":
            formatted = formatDateTimeCompact(date);
            break;
        case "time":
            formatted = formatTime(date);
            break;
        case "timeShort":
            formatted = formatTimeShort(date);
            break;
    }

    return (
        <span className={className} title={tzName ? `Time shown in ${tzName}` : undefined}>
            {formatted}
            {showTimezone && tzName && formatType !== "date" && formatType !== "datetime" && formatType !== "datetimeCompact" && formatType !== "time" && (
                <span className="text-[0.8em] text-muted-foreground/70 ml-1 font-medium">{tzName}</span>
            )}
        </span>
    );
}
