"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";

export interface LiveFeedEvent {
  id: string;
  reader: string;
  article: string;
  slug: string;
  writer: string;
  amount: number;
  eventType: string;
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
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActiveRef = useRef(true);

  // ─── SSE connection ────────────────────────────────────────────────────────
  const connectSSE = useCallback(() => {
    if (typeof window === "undefined" || !isActiveRef.current) return;

    try {
      const es = new EventSource("/api/feed");
      esRef.current = es;

      es.onopen = () => setConnected(true);

      es.onmessage = (e) => {
        const event = JSON.parse(e.data);
        // Skip control messages (e.g. the initial "connected" handshake)
        if (!event.id || event.amount == null) return;

        setEvents((prev) => {
          if (prev.some((item) => item.id === event.id)) return prev;
          return [event as LiveFeedEvent, ...prev].slice(0, 100);
        });
      };

      es.onerror = () => {
        setConnected(false);
        es.close();
        if (!isActiveRef.current) return;
        retryTimeoutRef.current = setTimeout(connectSSE, 5000);
      };
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    isActiveRef.current = true;
    connectSSE();
    return () => {
      isActiveRef.current = false;
      esRef.current?.close();
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
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
    if (s < 60) return `${s} secs ago`;
    
    const m = Math.floor(s / 60);
    if (m < 60) return m === 1 ? "1 min ago" : `${m} mins ago`;
    
    const h = Math.floor(m / 60);
    if (h < 24) return h === 1 ? "1 hour ago" : `${h} hours ago`;
    
    const d = Math.floor(h / 24);
    return d === 1 ? "1 day ago" : `${d} days ago`;
  }

  const totalReads = useMemo(() => events.filter(e => e.eventType === "READ").length, [events]);
  const totalVolume = useMemo(
    () => events.reduce((sum, event) => sum + event.amount, 0),
    [events]
  );

  return {
    events,
    totalReads,
    totalVolume,
    connected,
    formatAge,
  };
}
