import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@/lib/x402";

/**
 * GET /api/articles/[slug]
 *
 * x402-gated article content delivery.
 * Returns 402 if no valid payment, serves content if payment verified.
 *
 * The article content is streamed from /content/articles/[slug].mdx
 * after the x402 payment proof is validated.
 */

// Map slugs to writer addresses (in production, look up from registry contract)
const WRITER_ADDRESSES: Record<string, `0x${string}`> = {
  "why-micro-payments-will-replace-subscriptions": "0x1234567890123456789012345678901234567890",
  "the-future-of-creator-economy-on-web3": "0x2345678901234567890123456789012345678901",
  "understanding-zero-knowledge-proofs":  "0x3456789012345678901234567890123456789012",
  "defi-yield-strategies-for-2026":        "0x4567890123456789012345678901234567890123",
  "building-on-arc-a-developers-guide":    "0x5678901234567890123456789012345678901234",
  "how-usyc-makes-idle-funds-work":        "0x6789012345678901234567890123456789012345",
  "the-death-of-the-paywall":              "0x1234567890123456789012345678901234567890",
  "real-time-settlement-why-speed-matters":"0x2345678901234567890123456789012345678901",
};

async function handler(
  _req: NextRequest,
  { payer }: { payer: string },
  slug: string
): Promise<NextResponse> {
  // TODO: Read from /content/articles/[slug].mdx using gray-matter
  // For now, return metadata confirming payment
  return NextResponse.json({
    slug,
    unlocked: true,
    payer,
    price: "0.001",
    currency: "USDC",
    settledAt: new Date().toISOString(),
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;
  const writerAddress = WRITER_ADDRESSES[slug] || "0x0000000000000000000000000000000000000000";

  const gatedHandler = withX402(
    (req, verified) => handler(req, verified, slug),
    writerAddress,
    slug
  );

  return gatedHandler(request);
}
