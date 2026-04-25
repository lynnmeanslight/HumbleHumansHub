import { NextRequest, NextResponse } from "next/server";
import { saveComment, fetchUserByAddress, prisma } from "@/lib/db";
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

const COMMENT_PAID_EVENT = parseAbiItem(
  "event CommentPaid(address indexed reader, address indexed writer, string slug, uint256 usdcPaid, string commentHash)"
);

export async function POST(request: NextRequest) {
  try {
    const { slug, authorAddr, content, txHash, writerAddress } = await request.json();

    if (!slug || !authorAddr || !content || !txHash || !writerAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify on-chain to prevent fake comments
    let receipt;
    try {
      receipt = await arcClient.getTransactionReceipt({ hash: txHash as Hash });
    } catch {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (receipt.status !== "success") {
      return NextResponse.json({ error: "Transaction reverted" }, { status: 400 });
    }

    let commentFound = false;
    let decodedAmount = 0;

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== (contracts.readerVault || "").toLowerCase()) continue;
      try {
        const decoded = decodeEventLog({
          abi: [COMMENT_PAID_EVENT],
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "CommentPaid" && decoded.args.slug === slug) {
          commentFound = true;
          decodedAmount = Number(formatUnits((decoded.args as any).usdcPaid, 18));
          
          await prisma.articleReadEvent.upsert({
            where: { txHash },
            create: {
              id: `${txHash}-${log.logIndex}`,
              txHash: txHash,
              logIndex: log.logIndex ?? 0,
              blockNumber: log.blockNumber ?? BigInt(0),
              reader: authorAddr,
              writerAddress: writerAddress,
              articleSlug: slug,
              amount: decodedAmount,
              eventType: "COMMENT",
              observedAt: new Date(),
            },
            update: {}
          });
          
          break;
        }
      } catch {}
    }

    if (!commentFound) {
      return NextResponse.json({ error: "No valid CommentPaid event found in tx" }, { status: 400 });
    }

    // Attempt to get user's display name
    const user = await fetchUserByAddress(authorAddr);
    let authorName = "Anonymous";
    if (user?.displayName) authorName = user.displayName;
    else if (user?.username) authorName = `@${user.username}`;
    else authorName = `${authorAddr.slice(0, 6)}...${authorAddr.slice(-4)}`;

    const comment = await saveComment({
      slug,
      authorAddr,
      content,
      txHash,
    });

    return NextResponse.json({ 
      comment: {
        id: comment.id,
        content: comment.content,
        author: authorName,
        author_addr: comment.authorAddr,
        article_slug: comment.articleSlug,
        tx_hash: comment.txHash,
        created_at: comment.createdAt.toISOString()
      } 
    });
  } catch (err: any) {
    console.error("[api/comments] POST failed:", err);
    return NextResponse.json({ error: `Failed to save comment: ${err.message || JSON.stringify(err)}` }, { status: 500 });
  }
}
