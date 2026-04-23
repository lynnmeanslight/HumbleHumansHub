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
    decimals: 18,
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

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function getEthereumProvider(): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { ethereum?: EthereumProvider }).ethereum;
}

function toHexChainId(chainId: number) {
  return `0x${chainId.toString(16)}`;
}

function normalizeHexChainId(chainId: string) {
  return chainId.toLowerCase();
}

function isChainMissingError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as {
    code?: number;
    data?: { originalError?: { code?: number } };
  };

  return maybeError.code === 4902 || maybeError.data?.originalError?.code === 4902;
}

export async function ensureArcWalletChain() {
  const provider = getEthereumProvider();
  if (!provider) {
    throw new Error("No injected wallet was found. Open this page in MetaMask and try again.");
  }

  const chainId = toHexChainId(arcTestnet.id);

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId }],
    });
    return;
  } catch (error) {
    if (!isChainMissingError(error)) throw error;
  }

  await provider.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId,
        chainName: arcTestnet.name,
        nativeCurrency: arcTestnet.nativeCurrency,
        rpcUrls: arcTestnet.rpcUrls.default.http,
        blockExplorerUrls: [arcTestnet.blockExplorers?.default.url].filter(Boolean),
      },
    ],
  });

  await provider.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId }],
  });
}

export async function getWalletChainId() {
  const provider = getEthereumProvider();
  if (!provider) return undefined;

  const chainId = await provider.request({
    method: "eth_chainId",
  });

  return typeof chainId === "string" ? normalizeHexChainId(chainId) : undefined;
}

export async function waitForArcWalletChain({
  timeoutMs = 5000,
  intervalMs = 150,
}: {
  timeoutMs?: number;
  intervalMs?: number;
} = {}) {
  const targetChainId = normalizeHexChainId(toHexChainId(arcTestnet.id));
  const startedAt = Date.now();

  while (Date.now() - startedAt <= timeoutMs) {
    const currentChainId = await getWalletChainId();
    if (currentChainId === targetChainId) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Wallet is still not on ${arcTestnet.name}. Please switch to chain ${arcTestnet.id} and try again.`);
}

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
  /** Cost per article read in USDC (18 decimals) */
  PRICE_PER_READ: BigInt("1000000000000000"), // 0.001 USDC = 1e15 (18 decimals)
  /** USDC float kept for immediate reads */
  FLOAT_AMOUNT: BigInt("10000000000000000"), // 0.01 USDC = 1e16 (18 decimals)
  /** Human-readable price */
  PRICE_DISPLAY: "$0.001",
  /** Price in USDC */
  PRICE_USDC: 0.001,
} as const;
