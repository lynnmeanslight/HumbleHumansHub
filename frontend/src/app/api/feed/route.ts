import { NextRequest } from "next/server";
import { createPublicClient, formatUnits, http, parseAbiItem } from "viem";
import { contracts } from "@/lib/arc";
import { fetchArticle, fetchRecentArticleReadEvents, prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const ARC_CHAIN_ID = Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID || "5042002");
const ARC_RPC = process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.testnet.arc.network";
const LIVE_FEED_SOURCE = process.env.LIVE_FEED_SOURCE || "auto";
const GOLDSKY_SUBGRAPH_URL =
  process.env.GOLDSKY_SUBGRAPH_URL ||
  "https://api.goldsky.com/api/public/project_cmmhgxyrkhhn501w826759k1v/subgraphs/humblehumanshub/0.0.1/gn";

const POLL_INTERVAL_MS = 3000;
const HEARTBEAT_INTERVAL_MS = 15000;

const ARTICLE_READ_EVENT = parseAbiItem(
  "event ArticleRead(address indexed reader, address indexed writer, string slug, uint256 usdcPaid)"
);
const COMMENT_PAID_EVENT = parseAbiItem(
  "event CommentPaid(address indexed reader, address indexed writer, string slug, uint256 usdcPaid, string commentHash)"
);
const CLAP_PAID_EVENT = parseAbiItem(
  "event ClapPaid(address indexed reader, address indexed writer, string slug, uint256 usdcPaid)"
);
const AGENT_SEARCH_PAID_EVENT = parseAbiItem(
  "event AgentSearchPaid(address indexed reader, uint256 totalFee, uint256 platformFee)"
);

const arcClient = createPublicClient({
  chain: {
    id: ARC_CHAIN_ID,
    name: "Arc Testnet",
    nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
    rpcUrls: { default: { http: [ARC_RPC] } },
  },
  transport: http(ARC_RPC),
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

interface GoldskyArticleRead {
  id: string;
  slug: string;
  reader: string;
  writer: string;
  usdcPaid: string;
  timestamp: string;
  txHash: string;
  blockNumber: string;
  logIndex: string;
}

async function fetchGoldskyArticleReads(limit = 100): Promise<GoldskyArticleRead[]> {
  const response = await fetch(GOLDSKY_SUBGRAPH_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      query: `
        query RecentArticleReads($limit: Int!) {
          articleReads(first: $limit, orderBy: timestamp, orderDirection: desc) {
            id
            slug
            reader
            writer
            usdcPaid
            timestamp
            txHash
            blockNumber
            logIndex
          }
        }
      `,
      variables: { limit },
    }),
  });

  if (!response.ok) {
    throw new Error(`Goldsky subgraph request failed (${response.status})`);
  }

  const payload = await response.json() as {
    data?: { articleReads?: GoldskyArticleRead[] };
    errors?: Array<{ message?: string }>;
  };

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message || "Unknown Goldsky error").join("; "));
  }

  return payload.data?.articleReads ?? [];
}

async function streamGoldskyFeed(
  enqueueSse: (payload: unknown) => void,
  isClosed: () => boolean,
) {
  const seenIds = new Set<string>();
  const articleCache = new Map<string, Awaited<ReturnType<typeof fetchArticle>>>();

  while (!isClosed()) {
    const recent = await fetchGoldskyArticleReads(100);
    const unseen = recent
      .filter((event) => !seenIds.has(event.id))
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

    for (const event of unseen) {
      if (isClosed()) return;
      seenIds.add(event.id);

      if (!articleCache.has(event.slug)) {
        articleCache.set(event.slug, await fetchArticle(event.slug));
      }

      const article = articleCache.get(event.slug);
      const timestamp = Number(event.timestamp) * 1000;
      const amount = Number(formatUnits(BigInt(event.usdcPaid), 18));

      enqueueSse({
        id: event.id,
        reader: shortenAddress(event.reader),
        article: article?.title ?? event.slug,
        slug: event.slug,
        writer: shortenAddress(event.writer),
        amount,
        eventType: "READ",
        txHash: event.txHash,
        blockNumber: Number(event.blockNumber),
        timestamp,
        ageMs: Math.max(0, Date.now() - timestamp),
      });
    }

    await sleep(POLL_INTERVAL_MS);
  }
}

async function streamRpcFeed(
  enqueueSse: (payload: unknown) => void,
  isClosed: () => boolean,
  readerVaultAddress: `0x${string}`,
) {
  let lastProcessedBlock = BigInt(0);
  const blockTimestampCache = new Map<bigint, number>();

  // 1. Instantly send recent events from the database
  try {
    const recentDbEvents = await fetchRecentArticleReadEvents(50);
    const reversed = [...recentDbEvents].reverse(); // oldest first so newest is at the top of the feed array
    for (const event of reversed) {
      if (isClosed()) return;
      const article = await fetchArticle(event.article_slug);
      
      enqueueSse({
        id: event.id,
        reader: shortenAddress(event.reader),
        article: article?.title ?? event.article_slug,
        slug: event.article_slug,
        writer: shortenAddress(event.writer_address),
        amount: event.amount,
        eventType: event.eventType || "READ",
        txHash: event.tx_hash,
        blockNumber: Number(event.block_number),
        timestamp: new Date(event.observed_at).getTime(),
        ageMs: Math.max(0, Date.now() - new Date(event.observed_at).getTime()),
      });
    }
  } catch (err) {
    console.error("Failed to load DB events for feed:", err);
  }

  // 2. Poll RPC for new events
  const latestBlock = await arcClient.getBlockNumber();
  lastProcessedBlock = latestBlock; // start polling from current block

  while (!isClosed()) {
    const chainTip = await arcClient.getBlockNumber();
    const fromBlock = lastProcessedBlock === BigInt(0) ? BigInt(0) : lastProcessedBlock + BigInt(1);

    if (chainTip >= fromBlock) {
      const logs = await arcClient.getLogs({
        address: readerVaultAddress,
        events: [ARTICLE_READ_EVENT, COMMENT_PAID_EVENT, CLAP_PAID_EVENT, AGENT_SEARCH_PAID_EVENT],
        fromBlock,
        toBlock: chainTip,
      });

      for (const log of logs) {
        if (isClosed() || !log.transactionHash || log.blockNumber == null) continue;

        let timestamp = blockTimestampCache.get(log.blockNumber);
        if (!timestamp) {
          const block = await arcClient.getBlock({ blockNumber: log.blockNumber });
          timestamp = Number(block.timestamp) * 1000;
          blockTimestampCache.set(log.blockNumber, timestamp);
        }

        let amount = 0;
        let eventType = "READ";
        let reader = "";
        let writerAddressFull = "";
        let slug = "";
        let articleTitle = "";

        if (log.eventName === "AgentSearchPaid") {
            const args = log.args as any;
            if (!args.reader || !args.totalFee) continue;
            reader = args.reader;
            amount = Number(formatUnits(args.totalFee, 18));
            eventType = "AGENT_SEARCH";
            writerAddressFull = "Platform"; // Agent searches benefit multiple writers and platform
            slug = "agent-search";
            articleTitle = "AI Research Query";
        } else {
            const args = log.args as any;
            if (!args.slug || !args.usdcPaid || !args.reader || !args.writer) continue;
            const article = await fetchArticle(args.slug);
            amount = Number(formatUnits(args.usdcPaid, 18));
            reader = args.reader;
            writerAddressFull = args.writer;
            slug = args.slug;
            articleTitle = article?.title ?? args.slug;

            if (log.eventName === "CommentPaid") eventType = "COMMENT";
            if (log.eventName === "ClapPaid") eventType = "CLAP";
        }

        const eventId = `${log.transactionHash}-${log.logIndex?.toString() ?? "0"}`;

        await prisma.articleReadEvent.upsert({
          where: { txHash: log.transactionHash },
          create: {
            id: eventId,
            txHash: log.transactionHash,
            logIndex: Number(log.logIndex ?? 0),
            blockNumber: BigInt(log.blockNumber),
            reader: reader,
            writerAddress: writerAddressFull,
            articleSlug: slug,
            amount: amount,
            eventType: eventType,
            observedAt: new Date(timestamp),
          },
          update: {}
        }).catch(err => console.error("Prisma upsert error:", err));

        enqueueSse({
          id: eventId,
          reader: shortenAddress(reader),
          article: articleTitle,
          slug: slug,
          writer: shortenAddress(writerAddressFull),
          amount,
          eventType,
          txHash: log.transactionHash,
          blockNumber: Number(log.blockNumber),
          timestamp,
          ageMs: Math.max(0, Date.now() - timestamp),
        });
      }
    }

    lastProcessedBlock = chainTip;
    await sleep(POLL_INTERVAL_MS);
  }
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const readerVaultAddress = contracts.readerVault;

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      let heartbeatId: ReturnType<typeof setInterval> | undefined;

      const close = () => {
        if (closed) return;
        closed = true;
        if (heartbeatId) clearInterval(heartbeatId);
      };

      request.signal.addEventListener("abort", close);

      const enqueueSse = (payload: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      try {
        if (!readerVaultAddress && LIVE_FEED_SOURCE !== "goldsky") {
          enqueueSse({
            type: "error",
            message: "ReaderVault address is not configured.",
            timestamp: Date.now(),
          });
          close();
          try {
            controller.close();
          } catch {}
          return;
        }

        enqueueSse({ type: "connected", timestamp: Date.now() });

        heartbeatId = setInterval(() => {
          enqueueSse({ type: "heartbeat", timestamp: Date.now() });
        }, HEARTBEAT_INTERVAL_MS);

        if (LIVE_FEED_SOURCE === "goldsky") {
          await streamGoldskyFeed(enqueueSse, () => closed);
        } else if (LIVE_FEED_SOURCE === "rpc") {
          if (!readerVaultAddress) {
            throw new Error("ReaderVault address is not configured.");
          }
          await streamRpcFeed(enqueueSse, () => closed, readerVaultAddress!);
        } else {
          try {
            await streamGoldskyFeed(enqueueSse, () => closed);
          } catch {
            if (!readerVaultAddress) {
              throw new Error("ReaderVault address is not configured.");
            }
            await streamRpcFeed(enqueueSse, () => closed, readerVaultAddress!);
          }
        }
      } catch (error) {
        enqueueSse({
          type: "error",
          message: error instanceof Error ? error.message : "Live feed failed",
          timestamp: Date.now(),
        });
      } finally {
        close();
        try {
          controller.close();
        } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
