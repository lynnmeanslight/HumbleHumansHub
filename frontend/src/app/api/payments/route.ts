import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/payments — Create a nanopayment intent
 * GET  /api/payments?intentId=&slug= — Verify payment
 *
 * In production: calls Circle Nanopayments API to batch micro-transactions.
 * In demo: creates signed mock intents that feed into x402 verification.
 */

interface PaymentIntent {
  id: string;
  slug: string;
  readerAddress: string;
  writerAddress: string;
  amount: number;
  status: "pending" | "settled" | "failed";
  txHash?: string;
  createdAt: string;
}

// In-memory store (replace with Redis/DB in production)
const intents = new Map<string, PaymentIntent>();

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { slug, readerAddress, writerAddress, amount = 0.001 } = body;

  if (!slug || !readerAddress) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const id = `pmt-${slug}-${readerAddress.slice(2, 8)}-${Date.now()}`;

  // TODO: Call Circle Nanopayments API here
  // const circleIntent = await createCircleNanopayment({ ... });

  const intent: PaymentIntent = {
    id,
    slug,
    readerAddress,
    writerAddress: writerAddress || "0x0000000000000000000000000000000000000000",
    amount,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  intents.set(id, intent);

  // Build x402 payment header template for the client
  const x402Header = JSON.stringify({
    x402Version: 1,
    scheme: "exact",
    network: `arc-testnet-${process.env.NEXT_PUBLIC_ARC_CHAIN_ID || "5042002"}`,
    payload: {
      signature: "PENDING_SIGNATURE", // Client fills this via wallet sign
      authorization: {
        from: readerAddress,
        to: writerAddress,
        value: "1000", // 0.001 USDC in atomic units
        validAfter: 0,
        validBefore: Math.floor(Date.now() / 1000) + 60,
        nonce: id,
      },
    },
  });

  return NextResponse.json({ intentId: id, x402Header });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const intentId = searchParams.get("intentId");
  const slug = searchParams.get("slug");

  if (!intentId) {
    return NextResponse.json({ error: "Missing intentId" }, { status: 400 });
  }

  const intent = intents.get(intentId);

  if (!intent) {
    return NextResponse.json({ error: "Intent not found" }, { status: 404 });
  }

  // TODO: Poll Circle API for settlement status
  // For demo: simulate instant settlement
  if (intent.status === "pending") {
    intent.status = "settled";
    intent.txHash = `0x${Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("")}`;
    intents.set(intentId, intent);
  }

  return NextResponse.json({
    intentId: intent.id,
    settled: intent.status === "settled",
    txHash: intent.txHash,
    amount: intent.amount,
    timestamp: new Date(intent.createdAt).getTime(),
  });
}
