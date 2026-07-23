"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

interface RealtimeListenerProps {
    tournamentId: string;
}

// Coalesce bursts of DB change events into at most one router.refresh() per
// window. During a live round many match rows update in quick succession;
// without throttling, every viewer triggers a full server re-render (and DB
// reads) per event, so egress/invocations scale with (updates × viewers).
const REFRESH_THROTTLE_MS = 4000;

export function RealtimeListener({ tournamentId }: RealtimeListenerProps) {
    const router = useRouter();
    // createBrowserClient() returns a fresh instance each call — memoize so the
    // effect doesn't tear down and re-subscribe the channel on every render.
    const supabase = useMemo(() => createClient(), []);
    const lastRefreshRef = useRef(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        // Trailing-edge throttle: the first event schedules a refresh; further
        // events while one is pending are coalesced into that single refresh.
        const scheduleRefresh = () => {
            if (timerRef.current) return;
            const elapsed = Date.now() - lastRefreshRef.current;
            const wait = Math.max(0, REFRESH_THROTTLE_MS - elapsed);
            timerRef.current = setTimeout(() => {
                timerRef.current = null;
                lastRefreshRef.current = Date.now();
                router.refresh();
            }, wait);
        };

        const channel = supabase
            .channel(`tournament-${tournamentId}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "tournaments",
                    filter: `id=eq.${tournamentId}`,
                },
                scheduleRefresh
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "matches",
                    filter: `tournament_id=eq.${tournamentId}`,
                },
                scheduleRefresh
            )
            .subscribe();

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            supabase.removeChannel(channel);
        };
    }, [supabase, router, tournamentId]);

    return null;
}
