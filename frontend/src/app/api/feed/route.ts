import { NextRequest } from "next/server";

/**
 * GET /api/feed — Server-Sent Events stream of live Arc transactions.
 *
 * Subscribes to Arc node's eth_subscribe newLogs and filters for
 * ReaderVault ArticleRead events.
 *
 * TODO: Implement Arc WebSocket subscription once contracts are deployed.
 * const ws = new WebSocket(process.env.NEXT_PUBLIC_ARC_RPC_URL!.replace('http', 'ws'));
 * ws.on('message', ...) → filter ArticleRead events → enqueue
 */

export async function GET(_request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", timestamp: Date.now() })}\n\n`)
      );

      // TODO: Subscribe to Arc node via WebSocket for live ArticleRead events
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
