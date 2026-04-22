/**
 * Circle Nanopayments helpers for high-frequency micro-transactions.
 *
 * Nanopayments enable batching of many $0.001 reads into efficient
 * settlement transactions on Arc, reducing gas overhead further.
 *
 * Docs: https://developers.circle.com/developer/docs/nanopayments
 */

export interface NanopaymentIntent {
  slug: string;
  readerAddress: string;
  writerAddress: string;
  amount: number; // in USDC
  timestamp: number;
}

export interface NanopaymentReceipt {
  intentId: string;
  settled: boolean;
  txHash?: string;
  amount: number;
  timestamp: number;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const CIRCLE_APP_ID = process.env.NEXT_PUBLIC_CIRCLE_APP_ID;

/**
 * Create a nanopayment intent for an article read.
 * Called from the client before attempting to read an article.
 */
export async function createReadIntent(
  params: Omit<NanopaymentIntent, "timestamp">
): Promise<{ intentId: string; x402Header: string }> {
  const res = await fetch(`${APP_URL}/api/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...params, timestamp: Date.now() }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Payment intent creation failed");
  }

  return res.json();
}

/**
 * Verify a completed nanopayment on the server.
 */
export async function verifyReadPayment(
  intentId: string,
  slug: string
): Promise<NanopaymentReceipt> {
  const res = await fetch(`${APP_URL}/api/payments?intentId=${intentId}&slug=${slug}`);

  if (!res.ok) {
    throw new Error("Payment verification failed");
  }

  return res.json();
}

/**
 * Build the X-Payment header for x402 requests.
 * In production, this is signed by the reader's wallet via EIP-3009.
 *
 * TODO: Integrate with wagmi signTypedData for real EIP-3009 Authorization.
 */
export function buildPaymentHeader(params: {
  from: string;
  to: string;
  value: string;
  validBefore: number;
  nonce: string;
  signature: string;
}): string {
  const payload = {
    x402Version: 1,
    scheme: "exact",
    network: `arc-testnet-${process.env.NEXT_PUBLIC_ARC_CHAIN_ID || "5042002"}`,
    payload: {
      signature: params.signature,
      authorization: {
        from: params.from,
        to: params.to,
        value: params.value,
        validAfter: 0,
        validBefore: params.validBefore,
        nonce: params.nonce,
      },
    },
  };
  return JSON.stringify(payload);
}
