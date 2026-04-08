"use client";

import { useState, useEffect } from "react";
import { formatDate, formatDateTime, formatDateTimeCompact, formatTime, formatTimeShort } from "@/lib/utils";

interface ClientTimeProps {
    date: string | Date;
    formatType?: "date" | "datetime" | "datetimeCompact" | "time" | "timeShort";
    className?: string;
    fallback?: string;
}

export function ClientTime({ date, formatType = "timeShort", className, fallback = "...", showTimezone = false }: ClientTimeProps & { showTimezone?: boolean }) {
    const [isMounted, setIsMounted] = useState(false);
    const [tzName, setTzName] = useState("");

    useEffect(() => {
        setIsMounted(true);
        try {
            const parts = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).formatToParts(new Date());
            const tz = parts.find(part => part.type === 'timeZoneName')?.value;
            if (tz) setTzName(tz);
        } catch (e) {
            // ignore
        }
    }, []);

    if (!isMounted) {
        return <span className={className}>{fallback}</span>;
    }

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
