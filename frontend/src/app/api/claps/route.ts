import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, decodeEventLog, parseAbiItem, type Hash, formatUnits } from "viem";
import { contracts } from "@/lib/arc";

const ARC_CHAIN_ID = Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID || "5042002");
const ARC_RPC = process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.testnet.arc.network";

const arcClient = createPublicClient({
  chain: {
    id: ARC_CHAIN_ID,
    name: "Arc Testnet",
    nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
    rpcUrls: { default: { http: [ARC_RPC] } },
  },
  transport: http(ARC_RPC),
});

const CLAP_PAID_EVENT = parseAbiItem(
  "event ClapPaid(address indexed reader, address indexed writer, string slug, uint256 usdcPaid)"
);

export async function POST(request: NextRequest) {
  try {
    const { txHash, slug, writerAddress, readerAddress } = await request.json();

    if (!txHash || !slug || !writerAddress || !readerAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify on-chain to prevent fake claps
    let receipt;
    try {
      receipt = await arcClient.waitForTransactionReceipt({ hash: txHash as Hash });
    } catch (err) {
      console.error("[api/claps] Transaction wait failed:", err);
      return NextResponse.json({ error: "Transaction not found or timed out" }, { status: 404 });
    }

    if (receipt.status !== "success") {
      return NextResponse.json({ error: "Transaction reverted" }, { status: 400 });
    }

    let clapFound = false;
    let decodedAmount = 0;

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== (contracts.readerVault || "").toLowerCase()) continue;
      try {
        const decoded = decodeEventLog({
          abi: [CLAP_PAID_EVENT],
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "ClapPaid" && decoded.args.slug === slug) {
          clapFound = true;
          decodedAmount = Number(formatUnits((decoded.args as any).usdcPaid, 18));
          
          // Save clap event directly into db as eventType: CLAP (borrowing recordReadEvent structure but changing type)
          const { prisma } = await import("@/lib/db");
          await prisma.articleReadEvent.upsert({
            where: { txHash },
            create: {
              id: `${txHash}-${log.logIndex}`,
              txHash: txHash,
              logIndex: log.logIndex ?? 0,
              blockNumber: log.blockNumber ?? BigInt(0),
              reader: readerAddress,
              writerAddress: writerAddress,
              articleSlug: slug,
              amount: decodedAmount,
              eventType: "CLAP",
              observedAt: new Date(),
            },
            update: {}
          });
          
          break;
        }
      } catch {}
    }

    if (!clapFound) {
      return NextResponse.json({ error: "No valid ClapPaid event found in tx" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/claps] POST failed:", err);
    return NextResponse.json({ error: "Failed to process clap" }, { status: 500 });
  }
}
