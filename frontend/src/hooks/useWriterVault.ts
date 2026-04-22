"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { contracts } from "@/lib/arc";

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
  const vaultAddress = contracts.writerVault;

  // ─── Read earnings ─────────────────────────────────────────────────────────
  const { data: earnings, refetch: refetchEarnings } = useReadContract(
    vaultAddress && address
      ? {
          address: vaultAddress,
          abi: WRITER_VAULT_ABI,
          functionName: "earningsOf",
          args: [address],
        }
      : undefined
  );

  const usycBalance = earnings?.[0] ?? BigInt(0);
  const estimatedUsdc = earnings?.[1] ?? BigInt(0);
  const totalReads = earnings?.[2] ?? BigInt(0);
  const lifetimeUsdc = earnings?.[3] ?? BigInt(0);

  // Mock values when contracts not deployed
  const mock = {
    usycBalance: BigInt(355800),   // 0.3558 USDC worth of USYC
    estimatedUsdc: BigInt(356090), // +yield
    totalReads: BigInt(347),
    lifetimeUsdc: BigInt(347000),  // $0.347 USDC lifetime
  };

  // ─── Withdraw ──────────────────────────────────────────────────────────────
  const { writeContract: writeWithdraw, data: withdrawTxHash, isPending: isWithdrawing } = useWriteContract();
  const { isLoading: isWithdrawConfirming, isSuccess: isWithdrawSuccess } = useWaitForTransactionReceipt({
    hash: withdrawTxHash,
  });

  function withdraw() {
    if (!vaultAddress || !address) return;
    writeWithdraw({
      address: vaultAddress,
      abi: WRITER_VAULT_ABI,
      functionName: "withdraw",
    });
  }

  return {
    usycBalance: vaultAddress ? usycBalance : mock.usycBalance,
    estimatedUsdc: vaultAddress ? estimatedUsdc : mock.estimatedUsdc,
    totalReads: vaultAddress ? totalReads : mock.totalReads,
    lifetimeUsdc: vaultAddress ? lifetimeUsdc : mock.lifetimeUsdc,
    refetchEarnings,

    withdraw,
    isWithdrawing: isWithdrawing || isWithdrawConfirming,
    isWithdrawSuccess,

    isContractDeployed: !!vaultAddress,
  };
}
