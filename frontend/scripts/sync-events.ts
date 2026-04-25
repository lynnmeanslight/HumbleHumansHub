import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";
import { createPublicClient, http, parseAbiItem, formatUnits } from "viem";

const prisma = new PrismaClient();

const ARC_CHAIN_ID = Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID || "5042002");
const ARC_RPC = process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.testnet.arc.network";
const READER_VAULT = process.env.NEXT_PUBLIC_READER_VAULT_ADDRESS as `0x${string}`;

const ARTICLE_READ_EVENT = parseAbiItem(
  "event ArticleRead(address indexed reader, address indexed writer, string slug, uint256 usdcPaid)"
);

async function main() {
  if (!READER_VAULT) {
    throw new Error("Missing NEXT_PUBLIC_READER_VAULT_ADDRESS");
  }

  const arcClient = createPublicClient({
    chain: {
      id: ARC_CHAIN_ID,
      name: "Arc Testnet",
      nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
      rpcUrls: { default: { http: [ARC_RPC] } },
    },
    transport: http(ARC_RPC),
  });

  console.log(`Starting sync for ReaderVault: ${READER_VAULT}`);
  
  const latestBlock = await arcClient.getBlockNumber();
  const fromBlock = latestBlock > BigInt(500) ? latestBlock - BigInt(500) : BigInt(0); // Look back 500 blocks

  console.log(`Fetching logs from block ${fromBlock} to ${latestBlock}...`);
  
  const allLogs = [];
  const chunkSize = BigInt(5);

  for (let start = fromBlock; start <= latestBlock; start += chunkSize) {
    const end = start + chunkSize - BigInt(1) > latestBlock ? latestBlock : start + chunkSize - BigInt(1);
    try {
      const chunkLogs = await arcClient.getLogs({
        address: READER_VAULT,
        event: ARTICLE_READ_EVENT,
        fromBlock: start,
        toBlock: end,
      });
      allLogs.push(...chunkLogs);
    } catch (err) {
      console.warn(`Failed to fetch chunk ${start}-${end}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`Found ${allLogs.length} ArticleRead events.`);

  let synced = 0;
  for (const log of allLogs) {
    if (!log.transactionHash || log.blockNumber == null) continue;
    if (!log.args.slug || !log.args.usdcPaid || !log.args.reader || !log.args.writer) continue;

    const block = await arcClient.getBlock({ blockNumber: log.blockNumber });
    const timestamp = Number(block.timestamp) * 1000;
    const amount = Number(formatUnits(log.args.usdcPaid, 18));
    const eventId = `${log.transactionHash}-${log.logIndex?.toString() ?? "0"}`;

    try {
      await prisma.articleReadEvent.upsert({
        where: { txHash: log.transactionHash },
        create: {
          id: eventId,
          txHash: log.transactionHash,
          logIndex: Number(log.logIndex ?? 0),
          blockNumber: BigInt(log.blockNumber),
          reader: log.args.reader,
          writerAddress: log.args.writer,
          articleSlug: log.args.slug,
          amount: amount,
          eventType: "READ",
          observedAt: new Date(timestamp),
        },
        update: {}
      });
      synced++;
      console.log(`Synced: ${log.args.slug} by ${log.args.reader}`);
    } catch (err) {
      console.error(`Failed to sync ${eventId}:`, err);
    }
  }

  console.log(`\n✅ Sync complete. Added/Verified ${synced} events to DB.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
