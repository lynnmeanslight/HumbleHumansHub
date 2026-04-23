"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId, useSwitchChain } from "wagmi";
import { contracts, arcTestnet, ensureArcWalletChain, waitForArcWalletChain } from "@/lib/arc";

const WRITER_VAULT_ABI = [
  {
    name: "withdraw",
    type: "function",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "earningsOf",
    type: "function",
    inputs: [{ name: "writer", type: "address" }],
    outputs: [
      { name: "usyc", type: "uint256" },
      { name: "estimatedUsdc", type: "uint256" },
      { name: "reads", type: "uint256" },
      { name: "lifetimeUsdc", type: "uint256" },
    ],
    stateMutability: "view",
  },
] as const;

export function useWriterVault() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const vaultAddress = contracts.writerVault;

  const isOnArc = chainId === arcTestnet.id;

  async function switchToArc() {
    try {
      await switchChainAsync({ chainId: arcTestnet.id });
    } catch {
      await ensureArcWalletChain();
    }
    await waitForArcWalletChain();
  }

  // ─── Read earnings (always reads from Arc Testnet RPC) ────────────────────
  const { data: earnings, refetch: refetchEarnings } = useReadContract(
    vaultAddress && address
      ? {
          address: vaultAddress,
          abi: WRITER_VAULT_ABI,
          functionName: "earningsOf",
          args: [address],
          chainId: arcTestnet.id,
        }
      : undefined
  );

  const usycBalance = earnings?.[0] ?? BigInt(0);
  const estimatedUsdc = earnings?.[1] ?? BigInt(0);
  const totalReads = earnings?.[2] ?? BigInt(0);
  const lifetimeUsdc = earnings?.[3] ?? BigInt(0);

  // ─── Withdraw ──────────────────────────────────────────────────────────────
  const { writeContractAsync: writeWithdraw, data: withdrawTxHash, isPending: isWithdrawing } = useWriteContract();
  const { isLoading: isWithdrawConfirming, isSuccess: isWithdrawSuccess } = useWaitForTransactionReceipt({
    hash: withdrawTxHash,
    chainId: arcTestnet.id,
  });

  async function withdraw() {
    if (!vaultAddress) throw new Error("WriterVault address not configured");
    if (!address) throw new Error("Wallet not connected");
    if (!isOnArc) await switchToArc();
    await writeWithdraw({
      account: address,
      address: vaultAddress,
      abi: WRITER_VAULT_ABI,
      functionName: "withdraw",
      chainId: arcTestnet.id,
    });
  }

  return {
    usycBalance,
    estimatedUsdc,
    totalReads,
    lifetimeUsdc,
    refetchEarnings,

    withdraw,
    isWithdrawing: isWithdrawing || isWithdrawConfirming,
    isWithdrawSuccess,

    // Chain state
    isOnArc,
    switchToArc,
    isContractDeployed: !!vaultAddress,
  };
}
