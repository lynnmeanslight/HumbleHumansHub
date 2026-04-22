"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { contracts, PAYMENT } from "@/lib/arc";

const READER_VAULT_ABI = [
  {
    name: "deposit",
    type: "function",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
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
  const { address } = useAccount();
  const vaultAddress = contracts.readerVault;

  // ─── Read balance ──────────────────────────────────────────────────────────
  const { data: balance, refetch: refetchBalance } = useReadContract(
    vaultAddress && address
      ? {
          address: vaultAddress,
          abi: READER_VAULT_ABI,
          functionName: "balanceOf",
          args: [address],
        }
      : undefined
  );

  const usdcFloat = balance?.[0] ?? BigInt(0);
  const usycStaked = balance?.[1] ?? BigInt(0);
  const totalUsdcValue = balance?.[2] ?? BigInt(0);

  // Mock values when contracts not deployed
  const mockBalance = {
    usdcFloat: BigInt(10000),     // 0.01 USDC
    usycStaked: BigInt(89000),    // 0.089 USDC worth of USYC
    totalUsdcValue: BigInt(99200), // ~0.099 USDC
  };

  // ─── Deposit ───────────────────────────────────────────────────────────────
  const { writeContract: writeDeposit, data: depositTxHash, isPending: isDepositing } = useWriteContract();
  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({
    hash: depositTxHash,
  });

  function deposit(amount: bigint) {
    if (!vaultAddress || !address) return;
    writeDeposit({
      address: vaultAddress,
      abi: READER_VAULT_ABI,
      functionName: "deposit",
      args: [amount],
    });
  }

  // ─── Pay for read ──────────────────────────────────────────────────────────
  const { writeContract: writePayForRead, data: payTxHash, isPending: isPaying } = useWriteContract();
  const { isLoading: isPayConfirming, isSuccess: isPaySuccess } = useWaitForTransactionReceipt({
    hash: payTxHash,
  });

  function payForRead(writerAddress: `0x${string}`, slug: string) {
    if (!vaultAddress || !address) return;
    writePayForRead({
      address: vaultAddress,
      abi: READER_VAULT_ABI,
      functionName: "payForRead",
      args: [address, writerAddress, slug],
    });
  }

  // ─── Withdraw ──────────────────────────────────────────────────────────────
  const { writeContract: writeWithdraw, data: withdrawTxHash, isPending: isWithdrawing } = useWriteContract();
  const { isLoading: isWithdrawConfirming, isSuccess: isWithdrawSuccess } = useWaitForTransactionReceipt({
    hash: withdrawTxHash,
  });

  function withdraw() {
    if (!vaultAddress || !address) return;
    writeWithdraw({
      address: vaultAddress,
      abi: READER_VAULT_ABI,
      functionName: "withdraw",
    });
  }

  return {
    // Balance (use mock if contract not deployed)
    usdcFloat: vaultAddress ? usdcFloat : mockBalance.usdcFloat,
    usycStaked: vaultAddress ? usycStaked : mockBalance.usycStaked,
    totalUsdcValue: vaultAddress ? totalUsdcValue : mockBalance.totalUsdcValue,
    refetchBalance,

    // Actions
    deposit,
    isDepositing: isDepositing || isDepositConfirming,
    isDepositSuccess,

    payForRead,
    isPaying: isPaying || isPayConfirming,
    isPaySuccess,

    withdraw,
    isWithdrawing: isWithdrawing || isWithdrawConfirming,
    isWithdrawSuccess,

    // State
    isContractDeployed: !!vaultAddress,
    pricePerRead: PAYMENT.PRICE_PER_READ,
  };
}
