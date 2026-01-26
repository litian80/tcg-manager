"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

interface RealtimeListenerProps {
    tournamentId: string;
}

export function RealtimeListener({ tournamentId }: RealtimeListenerProps) {
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
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
                (payload) => {
                    console.log("Tournament updated:", payload);
                    toast.info("Tournament data updated.");
                    router.refresh();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, router, tournamentId]);

    return null;
}
