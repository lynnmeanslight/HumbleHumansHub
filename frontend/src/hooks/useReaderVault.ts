"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useSwitchChain } from "wagmi";
import { contracts, PAYMENT, arcTestnet, ensureArcWalletChain, waitForArcWalletChain } from "@/lib/arc";

const TXPOOL_RETRY_ATTEMPTS = 3;
const TXPOOL_RETRY_DELAY_MS = 1500;

const READER_VAULT_ABI = [
  {
    name: "deposit",
    type: "function",
    inputs: [],
    outputs: [],
    stateMutability: "payable",
  },
  {
    name: "withdraw",
    type: "function",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "payForRead",
    type: "function",
    inputs: [
      { name: "reader", type: "address" },
      { name: "writer", type: "address" },
      { name: "slug", type: "string" },
      { name: "price", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "payForComment",
    type: "function",
    inputs: [
      { name: "reader", type: "address" },
      { name: "writer", type: "address" },
      { name: "slug", type: "string" },
      { name: "price", type: "uint256" },
      { name: "commentHash", type: "string" }
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "payForClap",
    type: "function",
    inputs: [
      { name: "reader", type: "address" },
      { name: "writer", type: "address" },
      { name: "slug", type: "string" }
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "payForAgentSearch",
    type: "function",
    inputs: [
      { name: "reader", type: "address" },
      { name: "writers", type: "address[]" },
      { name: "slugs", type: "string[]" },
      { name: "authorShares", type: "uint256[]" },
      { name: "totalPrice", type: "uint256" }
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "reader", type: "address" }],
    outputs: [
      { name: "usdcBalance", type: "uint256" },
      { name: "usycBalance", type: "uint256" },
      { name: "estimatedUsdcValue", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    name: "activityOf",
    type: "function",
    inputs: [{ name: "reader", type: "address" }],
    outputs: [
      { name: "reads", type: "uint256" },
      { name: "claps", type: "uint256" },
      { name: "comments", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    name: "usdcFloat",
    type: "function",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "usycStaked",
    type: "function",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTxpoolFullError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes("txpool is full") || message.includes("tx pool is full");
}

function toFriendlyWriteError(error: unknown) {
  if (isTxpoolFullError(error)) {
    return new Error("The Arc RPC is congested right now. We retried automatically, but the transaction pool is still full. Wait a few seconds and try again.");
  }
  return error instanceof Error ? error : new Error("Transaction failed");
}

export function useReaderVault() {
  const { address, chainId: walletChainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const vaultAddress = contracts.readerVault;

  const isOnArc = walletChainId === arcTestnet.id;

  async function switchToArc() {
    try {
      await switchChainAsync({ chainId: arcTestnet.id });
    } catch {
      await ensureArcWalletChain();
    }
    await waitForArcWalletChain();
  }

  async function switchToArcAsync() {
    await switchToArc();
  }

  // ─── Read balance (always reads from Arc Testnet RPC) ──────────────────────
  const { data: balance, refetch: refetchBalance } = useReadContract(
    vaultAddress && address
      ? {
          address: vaultAddress,
          abi: READER_VAULT_ABI,
          functionName: "balanceOf",
          args: [address],
          chainId: arcTestnet.id,
        }
      : undefined
  );

  const usdcFloat = balance?.[0] ?? BigInt(0);
  const usycStaked = balance?.[1] ?? BigInt(0);
  const totalUsdcValue = balance?.[2] ?? BigInt(0);

  // ─── Read activity ─────────────────────────────────────────────────────────
  const { data: activity, refetch: refetchActivity } = useReadContract(
    vaultAddress && address
      ? {
          address: vaultAddress,
          abi: READER_VAULT_ABI,
          functionName: "activityOf",
          args: [address],
          chainId: arcTestnet.id,
        }
      : undefined
  );

  const totalReadsPerformed = activity?.[0] ?? BigInt(0);
  const totalClapsGiven = activity?.[1] ?? BigInt(0);
  const totalCommentsGiven = activity?.[2] ?? BigInt(0);

  // ─── Deposit ───────────────────────────────────────────────────────────────
  const { writeContractAsync: writeDeposit, data: depositTxHash, isPending: isDepositing, error: depositWriteError } = useWriteContract();
  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess, error: depositReceiptError } = useWaitForTransactionReceipt({
    hash: depositTxHash,
    chainId: arcTestnet.id,
  });

  async function deposit(amount: bigint) {
    if (!vaultAddress) throw new Error("ReaderVault address not configured");
    if (!address) throw new Error("Wallet not connected");
    if (!isOnArc) await switchToArcAsync();
    await writeDeposit({
      account: address,
      address: vaultAddress,
      abi: READER_VAULT_ABI,
      functionName: "deposit",
      value: amount,
      chain: arcTestnet
    });
  }

  // ─── Pay for read ──────────────────────────────────────────────────────────
  const {
    writeContractAsync: writePayForRead,
    data: payTxHash,
    isPending: isPaySubmitting,
    error: payWriteError,
  } = useWriteContract();
  const {
    isLoading: isPayConfirming,
    isSuccess: isPaySuccess,
    error: payReceiptError,
  } = useWaitForTransactionReceipt({
    hash: payTxHash,
    chainId: arcTestnet.id,
  });

  async function payForRead(writerAddress: `0x${string}`, slug: string, price: bigint) {
    if (!vaultAddress) throw new Error("ReaderVault address not configured");
    if (!address) throw new Error("Wallet not connected");
    if (!isOnArc) await switchToArcAsync();

    for (let attempt = 1; attempt <= TXPOOL_RETRY_ATTEMPTS; attempt += 1) {
      try {
        await writePayForRead({
          account: address,
          address: vaultAddress,
          abi: READER_VAULT_ABI,
          functionName: "payForRead",
          args: [address, writerAddress, slug, price],
          chainId: arcTestnet.id,
        });
        return;
      } catch (error) {
        if (!isTxpoolFullError(error) || attempt === TXPOOL_RETRY_ATTEMPTS) {
          throw toFriendlyWriteError(error);
        }
        await sleep(TXPOOL_RETRY_DELAY_MS * attempt);
      }
    }
  }

  // ─── Pay for comment ───────────────────────────────────────────────────────
  const { writeContractAsync: writePayForComment, isPending: isCommentSubmitting } = useWriteContract();
  async function payForComment(writerAddress: `0x${string}`, slug: string, price: bigint, commentHash: string) {
    if (!vaultAddress) throw new Error("ReaderVault address not configured");
    if (!address) throw new Error("Wallet not connected");
    if (!isOnArc) await switchToArcAsync();

    for (let attempt = 1; attempt <= TXPOOL_RETRY_ATTEMPTS; attempt += 1) {
      try {
        const txHash = await writePayForComment({
          account: address,
          address: vaultAddress,
          abi: READER_VAULT_ABI,
          functionName: "payForComment",
          args: [address, writerAddress, slug, price, commentHash],
          chainId: arcTestnet.id,
        });
        return txHash;
      } catch (error) {
        if (!isTxpoolFullError(error) || attempt === TXPOOL_RETRY_ATTEMPTS) {
          throw toFriendlyWriteError(error);
        }
        await sleep(TXPOOL_RETRY_DELAY_MS * attempt);
      }
    }
  }

  // ─── Pay for clap ──────────────────────────────────────────────────────────
  const { writeContractAsync: writePayForClap, isPending: isClapSubmitting } = useWriteContract();
  async function payForClap(writerAddress: `0x${string}`, slug: string) {
    if (!vaultAddress) throw new Error("ReaderVault address not configured");
    if (!address) throw new Error("Wallet not connected");
    if (!isOnArc) await switchToArcAsync();

    for (let attempt = 1; attempt <= TXPOOL_RETRY_ATTEMPTS; attempt += 1) {
      try {
        const txHash = await writePayForClap({
          account: address,
          address: vaultAddress,
          abi: READER_VAULT_ABI,
          functionName: "payForClap",
          args: [address, writerAddress, slug],
          chainId: arcTestnet.id,
        });
        return txHash;
      } catch (error) {
        if (!isTxpoolFullError(error) || attempt === TXPOOL_RETRY_ATTEMPTS) {
          throw toFriendlyWriteError(error);
        }
        await sleep(TXPOOL_RETRY_DELAY_MS * attempt);
      }
    }
  }

  // ─── Pay for agent search ──────────────────────────────────────────────────
  const { writeContractAsync: writePayForAgentSearch, isPending: isAgentSearchSubmitting } = useWriteContract();
  async function payForAgentSearch(writers: `0x${string}`[], slugs: string[], authorShares: bigint[], totalPrice: bigint) {
    if (!vaultAddress) throw new Error("ReaderVault address not configured");
    if (!address) throw new Error("Wallet not connected");
    if (!isOnArc) await switchToArcAsync();

    for (let attempt = 1; attempt <= TXPOOL_RETRY_ATTEMPTS; attempt += 1) {
      try {
        const txHash = await writePayForAgentSearch({
          account: address,
          address: vaultAddress,
          abi: READER_VAULT_ABI,
          functionName: "payForAgentSearch",
          args: [address, writers, slugs, authorShares, totalPrice],
          chainId: arcTestnet.id,
        });
        return txHash;
      } catch (error) {
        if (!isTxpoolFullError(error) || attempt === TXPOOL_RETRY_ATTEMPTS) {
          throw toFriendlyWriteError(error);
        }
        await sleep(TXPOOL_RETRY_DELAY_MS * attempt);
      }
    }
  }

  // ─── Withdraw ──────────────────────────────────────────────────────────────
  const { writeContractAsync: writeWithdraw, data: withdrawTxHash, isPending: isWithdrawing } = useWriteContract();
  const { isLoading: isWithdrawConfirming, isSuccess: isWithdrawSuccess } = useWaitForTransactionReceipt({
    hash: withdrawTxHash,
    chainId: arcTestnet.id,
  });

  async function withdraw() {
    if (!vaultAddress) throw new Error("ReaderVault address not configured");
    if (!address) throw new Error("Wallet not connected");
    if (!isOnArc) await switchToArcAsync();
    await writeWithdraw({
      address: vaultAddress,
      abi: READER_VAULT_ABI,
      functionName: "withdraw",
      chainId: arcTestnet.id,
    });
  }

  return {
    // Balance
    usdcFloat,
    usycStaked,
    totalUsdcValue,
    refetchBalance,

    // Activity
    totalReadsPerformed,
    totalClapsGiven,
    totalCommentsGiven,
    refetchActivity,

    // Actions
    deposit,
    isDepositing: isDepositing || isDepositConfirming,
    isDepositSuccess,
    depositError: depositWriteError ?? depositReceiptError,

    payForRead,
    isPaying: isPaySubmitting || isPayConfirming,
    isPaySubmitting,
    isPayConfirming,
    isPaySuccess,
    payTxHash,
    payError: payWriteError ?? payReceiptError,

    payForComment,
    isCommentSubmitting,

    payForClap,
    isClapSubmitting,

    payForAgentSearch,
    isAgentSearchSubmitting,

    withdraw,
    isWithdrawing: isWithdrawing || isWithdrawConfirming,
    isWithdrawSuccess,

    // Chain state
    isOnArc,
    switchToArc,
    switchToArcAsync,
    isContractDeployed: !!vaultAddress,
    pricePerRead: PAYMENT.PRICE_PER_READ,
  };
}
