import { defineChain } from "viem";

/**
 * Arc Testnet chain configuration
 * Arc is an EVM-compatible L1 with USDC as native gas token
 */
export const arcTestnet = defineChain({
  id: Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID) || 5042002,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 6,
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.testnet.arc.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Arc Explorer",
      url: "https://testnet.arcscan.app",
    },
  },
  testnet: true,
});

/**
 * Contract addresses on Arc Testnet
 */
export const contracts = {
  readerVault: process.env.NEXT_PUBLIC_READER_VAULT_ADDRESS as `0x${string}` | undefined,
  writerVault: process.env.NEXT_PUBLIC_WRITER_VAULT_ADDRESS as `0x${string}` | undefined,
  usycTeller: process.env.NEXT_PUBLIC_USYC_TELLER_ADDRESS as `0x${string}` | undefined,
  usycToken: process.env.NEXT_PUBLIC_USYC_TOKEN_ADDRESS as `0x${string}` | undefined,
  usdc: process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}` | undefined,
} as const;

/**
 * Micro-payment constants
 */
export const PAYMENT = {
  /** Cost per article read in USDC (6 decimals) */
  PRICE_PER_READ: BigInt(1000), // 0.001 USDC = 1000 units (6 decimals)
  /** USDC float kept for immediate reads */
  FLOAT_AMOUNT: BigInt(10000), // 0.01 USDC
  /** Human-readable price */
  PRICE_DISPLAY: "$0.001",
  /** Price in USDC */
  PRICE_USDC: 0.001,
} as const;
