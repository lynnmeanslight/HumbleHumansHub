"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface LiveFeedEvent {
  id: string;
  reader: string;
  article: string;
  slug: string;
  writer: string;
  amount: number;
  txHash?: string;
  blockNumber?: number;
  timestamp: number;
  ageMs: number;
}

/**
 * useLiveFeed — subscribes to real-time Arc transaction events via SSE.
 *
 * Connects to /api/feed which streams onchain ArticleRead events
 * from ReaderVault via Arc's event log.
 */
export function useLiveFeed() {
  const [events, setEvents] = useState<LiveFeedEvent[]>([]);
  const [totalReads, setTotalReads] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  // ─── SSE connection ────────────────────────────────────────────────────────
  const connectSSE = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      const es = new EventSource("/api/feed");
      esRef.current = es;

      es.onopen = () => setConnected(true);

      es.onmessage = (e) => {
        const event = JSON.parse(e.data);
        // Skip control messages (e.g. the initial "connected" handshake)
        if (!event.id || event.amount == null) return;
        setEvents(prev => [event as LiveFeedEvent, ...prev].slice(0, 100));
        setTotalReads(r => r + 1);
        setTotalVolume(v => v + event.amount);
      };

      es.onerror = () => {
        setConnected(false);
        es.close();
        // Retry after 5s
        setTimeout(connectSSE, 5000);
      };
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    connectSSE();
    return () => { esRef.current?.close(); };
  }, [connectSSE]);

  // ─── Age updater ──────────────────────────────────────────────────────────
  useEffect(() => {
    const iv = setInterval(() => {
      setEvents(prev =>
        prev.map(e => ({ ...e, ageMs: Date.now() - e.timestamp }))
      );
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  function formatAge(ageMs: number): string {
    const s = Math.floor(ageMs / 1000);
    if (s < 5) return "just now";
    if (s < 60) return `${s}s ago`;
    return `${Math.floor(s / 60)}m ago`;
  }

  return {
    events,
    totalReads,
    totalVolume,
    connected,
    formatAge,
  };
}
