/**
 * Circle Developer API client
 * Docs: https://developers.circle.com/developer/reference
 *
 * Used for:
 * - Nanopayments: high-frequency sub-cent USDC transfers
 * - Circle Wallets: programmatic wallet management
 * - USYC: yield-bearing balance tracking
 */

const CIRCLE_API_BASE = "https://api.circle.com/v1";
const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY || "";

if (!CIRCLE_API_KEY && typeof window === "undefined") {
  console.warn("[Circle] CIRCLE_API_KEY not set — API calls will fail");
}

async function circleRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${CIRCLE_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CIRCLE_API_KEY}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Circle API error ${res.status}: ${JSON.stringify(err)}`);
  }

  return res.json() as T;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CircleWallet {
  id: string;
  address: string;
  blockchain: string;
  state: string;
  createDate: string;
}

export interface CircleTransfer {
  id: string;
  source: { id: string; type: string };
  destination: { address: string; type: string };
  amount: { amount: string; currency: string };
  status: string;
  transactionHash?: string;
  createDate: string;
}

// ─── Wallets ──────────────────────────────────────────────────────────────────

export async function getWallet(walletId: string): Promise<CircleWallet> {
  const { data } = await circleRequest<{ data: CircleWallet }>(
    `/w3s/wallets/${walletId}`
  );
  return data;
}

export async function getWalletBalance(walletId: string) {
  const { data } = await circleRequest<{ data: { tokenBalances: Array<{ amount: string; token: { symbol: string } }> } }>(
    `/w3s/wallets/${walletId}/balances`
  );
  return data.tokenBalances;
}

// ─── Transfers ────────────────────────────────────────────────────────────────

export async function createTransfer(params: {
  sourceWalletId: string;
  destinationAddress: string;
  amount: string; // e.g. "0.001"
  currency?: string;
  idempotencyKey: string;
}): Promise<CircleTransfer> {
  const { data } = await circleRequest<{ data: CircleTransfer }>(
    "/w3s/transfers",
    {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey: params.idempotencyKey,
        source: { type: "wallet", id: params.sourceWalletId },
        destination: {
          type: "blockchain",
          address: params.destinationAddress,
          chain: "ARB", // Update to Arc once supported
        },
        amount: {
          amount: params.amount,
          currency: params.currency || "USDC",
        },
        feeLevel: "MEDIUM",
      }),
    }
  );
  return data;
}

export async function getTransfer(transferId: string): Promise<CircleTransfer> {
  const { data } = await circleRequest<{ data: CircleTransfer }>(
    `/w3s/transfers/${transferId}`
  );
  return data;
}

// ─── Nanopayments ────────────────────────────────────────────────────────────

/**
 * Send a micro-payment ($0.001 USDC) from reader wallet to writer address.
 * Uses Circle Nanopayments for high-frequency sub-cent transaction batching.
 */
export async function sendNanopayment(params: {
  readerWalletId: string;
  writerAddress: string;
  articleSlug: string;
}): Promise<{ transferId: string; txHash?: string }> {
  const idempotencyKey = `humblehumanshub-${params.articleSlug}-${params.readerWalletId}-${Date.now()}`;

  const transfer = await createTransfer({
    sourceWalletId: params.readerWalletId,
    destinationAddress: params.writerAddress,
    amount: "0.001",
    idempotencyKey,
  });

  return {
    transferId: transfer.id,
    txHash: transfer.transactionHash,
  };
}
