/**
 * x402 Payment Standard middleware for article content gating.
 *
 * x402 is a web-native HTTP payment standard:
 * - Client requests /api/articles/[slug]
 * - Server responds 402 Payment Required with payment details
 * - Client makes micropayment, includes proof in retry request
 * - Server verifies proof, serves content
 *
 * Spec: https://x402.org
 */

import { NextRequest, NextResponse } from "next/server";
import { contracts, PAYMENT } from "./arc";

export interface PaymentRequiredPayload {
  version: number;
  scheme: "exact";
  network: string;
  maxAmountRequired: string; // in USDC atomic units
  resource: string;
  description: string;
  memoRequired: boolean;
  payTo: string; // contract or address to pay
  maxTimeoutSeconds: number;
  asset: string; // USDC contract address
  extra?: Record<string, string>;
}

export interface PaymentPayload {
  x402Version: number;
  scheme: "exact";
  network: string;
  payload: {
    signature: string;
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
    maxAmountRequired: String(PAYMENT.PRICE_PER_READ), // 1000 = 0.001 USDC
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
 * Verify a payment proof from the X-Payment header.
 * Returns true if payment is valid, false otherwise.
 *
 * TODO: Implement full x402 signature verification once Circle SDK is available.
 * Currently: validates presence of payment header and basic structure.
 */
export async function verifyPayment(request: NextRequest): Promise<{
  valid: boolean;
  payer?: string;
  txHash?: string;
  error?: string;
}> {
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

  if (!payment.payload?.authorization?.from) {
    return { valid: false, error: "Missing payer address" };
  }

  // TODO: Verify EIP-3009 transferWithAuthorization signature
  // TODO: Check authorization hasn't expired (validBefore)
  // TODO: Verify payment amount matches PRICE_PER_READ
  // TODO: Submit transaction to Arc via ReaderVault.payForRead()

  return {
    valid: true,
    payer: payment.payload.authorization.from,
    txHash: undefined, // Set after on-chain settlement
  };
}

/**
 * x402 middleware wrapper for Next.js API routes.
 * Usage: export const GET = withX402(handler, writerAddress);
 */
export function withX402(
  handler: (req: NextRequest, verified: { payer: string }) => Promise<NextResponse>,
  writerAddress: string,
  slug: string
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const { valid, payer, error } = await verifyPayment(request);

    if (!valid) {
      // No valid payment — return 402
      return paymentRequired(slug, writerAddress);
    }

    return handler(request, { payer: payer! });
  };
}
