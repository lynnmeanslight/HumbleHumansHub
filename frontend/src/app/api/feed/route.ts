import { NextRequest } from "next/server";

/**
 * GET /api/feed — Server-Sent Events stream of live Arc transactions.
 *
 * In production: subscribes to Arc node's eth_subscribe newLogs
 * and filters for ReaderVault ArticleRead events.
 *
 * In demo: streams deterministic mock events at realistic intervals.
 * Switch USE_MOCK=false once contracts + Arc RPC are configured.
 */

const USE_MOCK = !process.env.NEXT_PUBLIC_READER_VAULT_ADDRESS;

const MOCK_READERS = [
  "0xAb3…f12", "0x7eC…a91", "0xD4f…c03",
  "0x91B…e45", "0xF2a…b78", "0x3cE…d56",
  "0x6aD…f89", "0x8bF…g12",
];

const MOCK_ARTICLES = [
  { title: "Why Micro-Payments Will Replace Subscriptions", slug: "why-micro-payments-will-replace-subscriptions", writer: "Aria Chen" },
  { title: "The Future of Creator Economy on Web3", slug: "the-future-of-creator-economy-on-web3", writer: "Marcus Rivera" },
  { title: "Understanding Zero-Knowledge Proofs", slug: "understanding-zero-knowledge-proofs", writer: "Dr. Sarah Nakamura" },
  { title: "DeFi Yield Strategies for 2026", slug: "defi-yield-strategies-for-2026", writer: "Jordan Blake" },
  { title: "Building on Arc: A Developer's Guide", slug: "building-on-arc-a-developers-guide", writer: "Leo Park" },
  { title: "How USYC Makes Idle Funds Work", slug: "how-usyc-makes-idle-funds-work", writer: "Emma Zhang" },
  { title: "The Death of the Paywall", slug: "the-death-of-the-paywall", writer: "Aria Chen" },
  { title: "Real-Time Settlement: Why Speed Matters", slug: "real-time-settlement-why-speed-matters", writer: "Marcus Rivera" },
];

let mockBlockNumber = 1000000;

function generateMockEvent() {
  const article = MOCK_ARTICLES[Math.floor(Math.random() * MOCK_ARTICLES.length)];
  mockBlockNumber += Math.floor(Math.random() * 3) + 1;

  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    reader: MOCK_READERS[Math.floor(Math.random() * MOCK_READERS.length)],
    article: article.title,
    slug: article.slug,
    writer: article.writer,
    amount: 0.001,
    txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
    blockNumber: mockBlockNumber,
    timestamp: Date.now(),
    ageMs: 0,
  };
}

export async function GET(_request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", timestamp: Date.now() })}\n\n`)
      );

      if (USE_MOCK) {
        // Stream mock events
        let count = 0;
        const interval = setInterval(() => {
          if (count >= 200) {
            // Stop after 200 events (prevents runaway in prod)
            clearInterval(interval);
            controller.close();
            return;
          }
          const event = generateMockEvent();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          count++;
        }, 2000 + Math.random() * 3000);

        // Clean up on disconnect
        _request.signal.addEventListener("abort", () => {
          clearInterval(interval);
          controller.close();
        });
      } else {
        // TODO: Subscribe to Arc node via WebSocket
        // const ws = new WebSocket(process.env.NEXT_PUBLIC_ARC_RPC_URL!.replace('http', 'ws'));
        // ws.on('message', ...) → filter ArticleRead events → enqueue
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable Nginx buffering
    },
  });
}
