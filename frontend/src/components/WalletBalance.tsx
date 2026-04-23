"use client";

import { useAccount } from "wagmi";
import { useReaderVault } from "@/hooks/useReaderVault";

export function WalletBalance() {
  const { isConnected } = useAccount();
  const { usdcFloat, totalUsdcValue } = useReaderVault();

  const floatUsdc  = Number(usdcFloat) / 1e18;
  const total      = Number(totalUsdcValue) / 1e18;
  const stakedUsdc = total - floatUsdc; // USYC staked, expressed in USDC

  if (!isConnected) {
    return (
      <div className="card p-5" id="wallet-balance">
        <div className="text-label mb-3">Your Balance</div>
        <p className="text-[13px] text-[#86868b]">Connect your wallet to view your balance.</p>
      </div>
    );
  }

  return (
    <div className="card p-5" id="wallet-balance">
      <div className="flex items-center justify-between mb-4">
        <span className="text-label">Your Balance</span>
        {stakedUsdc > 0 && (
          <span className="badge badge-positive text-[11px]">
            <span className="live-dot" />
            Earning
          </span>
        )}
      </div>
      <div className="mb-5">
        <div className="text-[32px] font-bold tracking-tight text-[#1d1d1f]">${total.toFixed(4)}</div>
        <div className="text-[13px] text-[#86868b] mt-1">Total Balance</div>
      </div>
      <div>
        {[
          { label: "USDC Float",   value: `$${floatUsdc.toFixed(4)}`,  dot: "bg-[#0071e3]", color: "text-[#1d1d1f]" },
          { label: "USYC Staked",  value: `$${stakedUsdc.toFixed(4)}`, dot: "bg-[#86868b]", color: "text-[#1d1d1f]" },
        ].map((r, i) => (
          <div key={r.label} className={`flex items-center justify-between py-3 ${i === 0 ? "border-b border-black/[0.06]" : ""}`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-2 h-2 rounded-full ${r.dot}`} />
              <span className="text-[14px] text-[#6e6e73]">{r.label}</span>
            </div>
            <span className={`text-[14px] font-medium ${r.color}`}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
