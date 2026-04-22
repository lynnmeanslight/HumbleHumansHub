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
 * When the API route is ready, connects to /api/feed which streams
 * onchain ArticleRead events from ReaderVault via Arc's event log.
 * Falls back to deterministic mock events if SSE is unavailable.
 */
export function useLiveFeed(useMock = true) {
  const [events, setEvents] = useState<LiveFeedEvent[]>([]);
  const [totalReads, setTotalReads] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  // ─── Mock data generator ───────────────────────────────────────────────────
  const MOCK_READERS = ["0xAb3…f12","0x7eC…a91","0xD4f…c03","0x91B…e45","0xF2a…b78","0x3cE…d56"];
  const MOCK_ARTICLES = [
    { title: "Why Micro-Payments Will Replace Subscriptions", slug: "why-micro-payments-will-replace-subscriptions", writer: "Aria Chen" },
    { title: "The Future of Creator Economy on Web3", slug: "the-future-of-creator-economy-on-web3", writer: "Marcus Rivera" },
    { title: "Understanding Zero-Knowledge Proofs", slug: "understanding-zero-knowledge-proofs", writer: "Dr. Sarah Nakamura" },
    { title: "DeFi Yield Strategies for 2026", slug: "defi-yield-strategies-for-2026", writer: "Jordan Blake" },
    { title: "Building on Arc: A Developer's Guide", slug: "building-on-arc-a-developers-guide", writer: "Leo Park" },
    { title: "How USYC Makes Idle Funds Work", slug: "how-usyc-makes-idle-funds-work", writer: "Emma Zhang" },
    { title: "The Death of the Paywall", slug: "the-death-of-the-paywall", writer: "Aria Chen" },
  ];

  const generateMockEvent = useCallback((): LiveFeedEvent => {
    const article = MOCK_ARTICLES[Math.floor(Math.random() * MOCK_ARTICLES.length)];
    return {
      id: `mock-${Date.now()}-${Math.random()}`,
      reader: MOCK_READERS[Math.floor(Math.random() * MOCK_READERS.length)],
      article: article.title,
      slug: article.slug,
      writer: article.writer,
      amount: 0.001,
      txHash: `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
      timestamp: Date.now(),
      ageMs: 0,
    };
  }, []);

  // ─── SSE connection ────────────────────────────────────────────────────────
  const connectSSE = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      const es = new EventSource("/api/feed");
      esRef.current = es;

      es.onopen = () => setConnected(true);

      es.onmessage = (e) => {
        const event: LiveFeedEvent = JSON.parse(e.data);
        setEvents(prev => [event, ...prev].slice(0, 100));
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

  // ─── Mock ticker ───────────────────────────────────────────────────────────
  const startMock = useCallback(() => {
    setConnected(true);

    // Seed initial events
    const initial = Array.from({ length: 8 }, generateMockEvent);
    setEvents(initial);
    setTotalReads(initial.length);
    setTotalVolume(initial.length * 0.001);

    // Stream new events
    const iv = setInterval(() => {
      setEvents(prev => [generateMockEvent(), ...prev].slice(0, 100));
      setTotalReads(r => r + 1);
      setTotalVolume(v => v + 0.001);
    }, 2000 + Math.random() * 3000);

    return () => clearInterval(iv);
  }, [generateMockEvent]);

  useEffect(() => {
    if (useMock) {
      return startMock();
    } else {
      connectSSE();
      return () => { esRef.current?.close(); };
    }
  }, [useMock, startMock, connectSSE]);

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
