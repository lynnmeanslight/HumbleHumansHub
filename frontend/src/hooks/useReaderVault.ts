"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId, useSwitchChain } from "wagmi";
import { contracts, PAYMENT, arcTestnet, ensureArcWalletChain, waitForArcWalletChain } from "@/lib/arc";

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
    isPending: isPaying,
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

  async function payForRead(writerAddress: `0x${string}`, slug: string) {
    if (!vaultAddress) throw new Error("ReaderVault address not configured");
    if (!address) throw new Error("Wallet not connected");
    if (!isOnArc) await switchToArcAsync();
    await writePayForRead({
      account: address,
      address: vaultAddress,
      abi: READER_VAULT_ABI,
      functionName: "payForRead",
      args: [address, writerAddress, slug],
      chainId: arcTestnet.id,
    });
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
      account: address,
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

    // Actions
    deposit,
    isDepositing: isDepositing || isDepositConfirming,
    isDepositSuccess,
    depositError: depositWriteError ?? depositReceiptError,

    payForRead,
    isPaying: isPaying || isPayConfirming,
    isPaySuccess,
    payTxHash,
    payError: payWriteError ?? payReceiptError,

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
