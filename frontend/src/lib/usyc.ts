/**
 * USYC / Hashnote Teller contract interaction helpers.
 *
 * USYC is a yield-bearing token backed by US Treasury bills.
 * Users stake USDC → USYC, earn ~5% APR, redeem USYC → USDC anytime (T+0).
 *
 * Non-US persons only; US users receive USDC directly (no staking).
 */

import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from "viem";
import { arcTestnet, contracts } from "./arc";

const TELLER_ABI = [
  {
    name: "subscribe",
    type: "function",
    inputs: [{ name: "usdcAmount", type: "uint256" }],
    outputs: [{ name: "usycAmount", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    name: "redeem",
    type: "function",
    inputs: [{ name: "usycAmount", type: "uint256" }],
    outputs: [{ name: "usdcAmount", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    name: "usdcToUsyc",
    type: "function",
    inputs: [{ name: "usdcAmount", type: "uint256" }],
    outputs: [{ name: "usycAmount", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "usycToUsdc",
    type: "function",
    inputs: [{ name: "usycAmount", type: "uint256" }],
    outputs: [{ name: "usdcAmount", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "exchangeRate",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const USYC_ABI = [
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "nav",
    type: "function",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

function getPublicClient() {
  return createPublicClient({
    chain: arcTestnet,
    transport: http(arcTestnet.rpcUrls.default.http[0]),
  });
}

// ─── Read-only helpers ────────────────────────────────────────────────────────

/**
 * Get current USYC/USDC exchange rate.
 * Returns USDC per USYC (scaled by 1e18).
 */
export async function getExchangeRate(): Promise<bigint> {
  if (!contracts.usycTeller) return BigInt(1e18);
  const client = getPublicClient();
  return client.readContract({
    address: contracts.usycTeller,
    abi: TELLER_ABI,
    functionName: "exchangeRate",
  });
}

/**
 * Convert USDC amount (6 decimals) to USYC.
 */
export async function usdcToUsyc(usdcAmount: bigint): Promise<bigint> {
  if (!contracts.usycTeller) return usdcAmount; // 1:1 fallback
  const client = getPublicClient();
  return client.readContract({
    address: contracts.usycTeller,
    abi: TELLER_ABI,
    functionName: "usdcToUsyc",
    args: [usdcAmount],
  });
}

/**
 * Convert USYC amount to USDC (6 decimals).
 */
export async function usycToUsdc(usycAmount: bigint): Promise<bigint> {
  if (!contracts.usycTeller) return usycAmount; // 1:1 fallback
  const client = getPublicClient();
  return client.readContract({
    address: contracts.usycTeller,
    abi: TELLER_ABI,
    functionName: "usycToUsdc",
    args: [usycAmount],
  });
}

/**
 * Get USYC balance for an address.
 */
export async function getUsycBalance(address: `0x${string}`): Promise<bigint> {
  if (!contracts.usycToken) return BigInt(0);
  const client = getPublicClient();
  return client.readContract({
    address: contracts.usycToken,
    abi: USYC_ABI,
    functionName: "balanceOf",
    args: [address],
  });
}

/**
 * Get USYC NAV (net asset value in USDC per USYC token).
 */
export async function getUsycNav(): Promise<bigint> {
  if (!contracts.usycToken) return BigInt(1e6); // 1 USDC fallback
  const client = getPublicClient();
  return client.readContract({
    address: contracts.usycToken,
    abi: USYC_ABI,
    functionName: "nav",
  });
}

// ─── Yield calculation ────────────────────────────────────────────────────────

/**
 * Estimate annualized yield in percent.
 * Based on USYC nav drift over time (5% APR ≈ 0.013% per day).
 */
export function estimateYieldApr(): number {
  return 5.0; // ~5% APR for USYC (T-bill backed)
}

/**
 * Calculate yield earned on a USYC balance over time.
 */
export function calculateYieldEarned(
  usycUsdcValue: number,
  holdingDays: number
): number {
  const dailyRate = estimateYieldApr() / 100 / 365;
  return usycUsdcValue * dailyRate * holdingDays;
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export function formatUsdc(amount: bigint): string {
  return `$${formatUnits(amount, 6)}`;
}

export function parseUsdc(amount: string): bigint {
  return parseUnits(amount, 6);
}
