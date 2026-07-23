"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Spectators (anonymous or non-participant viewers) don't open a Realtime
// websocket — that would scale connection count and message volume with the
// audience and hit the free-tier caps during big events. Instead they poll a
// tiny edge-cached fingerprint and soft-refresh (router.refresh, which keeps
// scroll + client state) only when results actually change. Participants and
// staff still use RealtimeListener for near-instant updates.
const POLL_INTERVAL_MS = 10000;

interface SpectatorPollerProps {
  tournamentId: string;
  initialVersion: string;
}

export function SpectatorPoller({ tournamentId, initialVersion }: SpectatorPollerProps) {
  const router = useRouter();
  const lastVersion = useRef(initialVersion);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const res = await fetch(`/api/tournaments/${tournamentId}/live-version`);
        if (res.ok) {
          const { v } = await res.json();
          if (typeof v === "string" && v !== "err" && v !== lastVersion.current) {
            lastVersion.current = v;
            router.refresh();
          }
        }
      } catch {
        // Ignore transient network errors; retry on the next tick.
      }
      if (!stopped) timer = setTimeout(poll, POLL_INTERVAL_MS);
    };

    timer = setTimeout(poll, POLL_INTERVAL_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [tournamentId, router]);

  return null;
}
