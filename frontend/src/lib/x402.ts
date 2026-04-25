/**
 * x402 Payment Standard middleware for article content gating.
 *
 * x402 is a web-native HTTP payment standard:
 * - Client requests /api/articles/[slug]
 * - Server responds 402 Payment Required with payment details
 * - Client makes micropayment on-chain (ReaderVault.payForRead), includes tx hash in retry
 * - Server verifies the tx succeeded on-chain and emitted ArticleRead for this slug
 * - Server increments DB reads only after on-chain confirmation, then serves content
 */

import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, decodeEventLog, parseAbiItem, verifyMessage, formatUnits, type Hash } from "viem";
import { contracts, PAYMENT } from "./arc";
import { incrementReads, hasPaidForArticle, recordReadEvent } from "./db";

export interface PaymentRequiredPayload {
  version: number;
  scheme: "exact";
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  memoRequired: boolean;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra?: Record<string, string>;
}

export interface PaymentPayload {
  x402Version: number;
  scheme: "exact";
  network: string;
  payload: {
    signature: string; // confirmed on-chain tx hash
    authorization: {
      from: string;
      to: string;
      value: string;
      validAfter: number;
      validBefore: number;
      nonce: string;
    };
  };
}

const NETWORK = `arc-testnet-${process.env.NEXT_PUBLIC_ARC_CHAIN_ID || "5042002"}`;
const ARC_CHAIN_ID = Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID || "5042002");
const ARC_RPC = process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.testnet.arc.network";

// viem public client pointing at Arc — used server-side for receipt verification
const arcClient = createPublicClient({
  chain: {
    id: ARC_CHAIN_ID,
    name: "Arc Testnet",
    nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
    rpcUrls: { default: { http: [ARC_RPC] } },
  },
  transport: http(ARC_RPC),
});

// ArticleRead(address indexed reader, address indexed writer, string slug, uint256 usdcPaid)
const ARTICLE_READ_EVENT = parseAbiItem(
  "event ArticleRead(address indexed reader, address indexed writer, string slug, uint256 usdcPaid)"
);

/**
 * Build a 402 Payment Required response for an article.
 */
export function paymentRequired(
  articleSlug: string,
  writerAddress: string
): NextResponse {
  const payload: PaymentRequiredPayload = {
    version: 1,
    scheme: "exact",
    network: NETWORK,
    maxAmountRequired: String(PAYMENT.PRICE_PER_READ),
    resource: `${process.env.NEXT_PUBLIC_APP_URL}/api/articles/${articleSlug}`,
    description: `Pay $0.001 USDC to read this article`,
    memoRequired: false,
    payTo: contracts.readerVault || writerAddress,
    maxTimeoutSeconds: 60,
    asset: contracts.usdc || "0x0000000000000000000000000000000000000000",
    extra: { slug: articleSlug, writer: writerAddress },
  };

  return NextResponse.json(
    { error: "Payment Required", ...payload },
    {
      status: 402,
      headers: {
        "X-Payment-Required": JSON.stringify(payload),
        "Content-Type": "application/json",
      },
    }
  );
}

/**
 * Verify payment by checking the on-chain tx receipt.
 * The tx must:
 *   1. Exist and have status "success"
 *   2. Contain an ArticleRead event emitted by ReaderVault
 *   3. Have the ArticleRead.slug matching the expected article slug
 */
export async function verifyPayment(
  request: NextRequest,
  expectedSlug: string,
  writerAddress: string
): Promise<{
  valid: boolean;
  payer?: string;
  txHash?: string;
  error?: string;
  logDetails?: { amount: number; blockNumber: bigint; logIndex: number };
}> {
  // ─── Previous Payer Bypass Check ─────────────────────────────────────────
  const readerAddress = request.headers.get("X-Reader-Address");
  if (readerAddress) {
    // Previous payment check
    const alreadyPaid = await hasPaidForArticle(readerAddress, expectedSlug);
    if (alreadyPaid) {
      return { valid: true, payer: readerAddress };
    }
  }

  // ── Cryptographic Writer Bypass (Fallback) ───────────────────────────────
  const writerSignature = request.headers.get("X-Writer-Signature");
  if (writerSignature) {
    try {
      const isValid = await verifyMessage({
        address: writerAddress as `0x${string}`,
        message: `I am the author of ${expectedSlug}`,
        signature: writerSignature as `0x${string}`,
      });
      if (isValid) {
        return { valid: true, payer: writerAddress };
      }
    } catch (err) {
      console.error("[x402] Writer signature verification failed:", err);
    }
  }

  const paymentHeader = request.headers.get("X-Payment");

  if (!paymentHeader) {
    return { valid: false, error: "Missing X-Payment header" };
  }

  let payment: PaymentPayload;
  try {
    payment = JSON.parse(paymentHeader);
  } catch {
    return { valid: false, error: "Invalid X-Payment JSON" };
  }

  if (payment.x402Version !== 1) {
    return { valid: false, error: "Unsupported x402 version" };
  }

  const txHash = payment.payload?.signature;
  const payer  = payment.payload?.authorization?.from;

  if (!txHash || !txHash.startsWith("0x") || txHash.length !== 66) {
    return { valid: false, error: "Missing or invalid transaction hash" };
  }
  if (!payer) {
    return { valid: false, error: "Missing payer address" };
  }

  // ── On-chain verification ────────────────────────────────────────────────
  let receipt: Awaited<ReturnType<typeof arcClient.getTransactionReceipt>>;
  try {
    receipt = await arcClient.getTransactionReceipt({ hash: txHash as Hash });
  } catch {
    return { valid: false, error: "Transaction not found on-chain" };
  }

  if (receipt.status !== "success") {
    return { valid: false, error: "Transaction reverted" };
  }

  const readerVaultAddress = contracts.readerVault?.toLowerCase();
  if (!readerVaultAddress) {
    return { valid: false, error: "ReaderVault address not configured" };
  }

  // Find the ArticleRead event emitted by ReaderVault in this tx
  let articleReadFound = false;
  let decodedAmount = 0;
  let logBlockNumber = BigInt(0);
  let logIndex = 0;

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== readerVaultAddress) continue;
    try {
      const decoded = decodeEventLog({
        abi: [ARTICLE_READ_EVENT],
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "ArticleRead" && decoded.args.slug === expectedSlug) {
        articleReadFound = true;
        decodedAmount = Number(formatUnits((decoded.args as any).usdcPaid, 18));
        logBlockNumber = log.blockNumber ?? BigInt(0);
        logIndex = log.logIndex ?? 0;
        break;
      }
    } catch {
      // Not this event — skip
    }
  }

  if (!articleReadFound) {
    return {
      valid: false,
      error: `No ArticleRead event for slug "${expectedSlug}" in tx ${txHash}`,
    };
  }

  return { 
    valid: true, 
    payer, 
    txHash, 
    logDetails: { amount: decodedAmount, blockNumber: logBlockNumber, logIndex: logIndex } 
  };
}

/**
 * x402 middleware wrapper for Next.js API routes.
 * Verifies on-chain payment before incrementing DB reads and serving content.
 */
export function withX402(
  handler: (req: NextRequest, verified: { payer: string }) => Promise<NextResponse>,
  writerAddress: string,
  slug: string
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const { valid, payer, txHash, logDetails } = await verifyPayment(request, slug, writerAddress);

    if (!valid) {
      return paymentRequired(slug, writerAddress);
    }

    // Only increment reads and record event if it was an actual on-chain payment
    if (txHash && logDetails && payer) {
      // Write to DB immediately so user doesn't have to pay again
      recordReadEvent({
        txHash,
        logIndex: logDetails.logIndex,
        blockNumber: logDetails.blockNumber,
        reader: payer,
        writerAddress: writerAddress,
        articleSlug: slug,
        amount: logDetails.amount
      }).catch(err => console.error("[x402] recordReadEvent failed:", err));

      incrementReads(slug).catch(err =>
        console.error("[x402] incrementReads failed:", err)
      );
    }

    return handler(request, { payer: payer! });
  };
}
