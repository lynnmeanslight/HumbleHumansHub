"use client";

import { useAccount } from "wagmi";
import { useWriterVault } from "@/hooks/useWriterVault";

export function WriterEarnings() {
  const { isConnected } = useAccount();
  const { estimatedUsdc, lifetimeUsdc, totalReads, totalClaps, totalComments } = useWriterVault();

  const earnedUsdc   = Number(lifetimeUsdc) / 1e18;
  const pendingUsdc  = Number(estimatedUsdc) / 1e18;
  const yieldEarned  = Math.max(0, pendingUsdc - earnedUsdc); // yield accrued on top of principal
  const reads        = Number(totalReads);
  const claps        = Number(totalClaps);
  const comments     = Number(totalComments);

  if (!isConnected) {
    return (
      <div className="card p-5" id="writer-earnings">
        <div className="text-label mb-3">Creator Earnings</div>
        <p className="text-[13px] text-[#86868b]">Connect to see your earnings.</p>
      </div>
    );
  }

  return (
    <div className="card p-5" id="writer-earnings">
      <div className="flex items-center justify-between mb-4">
        <span className="text-label">Creator Earnings</span>
        {yieldEarned > 0 && (
          <span className="badge badge-positive text-[11px]">+growth</span>
        )}
      </div>
      <div className="mb-5">
        <div className="text-[32px] font-bold tracking-tight text-[#1d1d1f]">${pendingUsdc.toFixed(4)}</div>
        <div className="text-[13px] text-[#86868b] mt-1 flex gap-2">
          <span>{reads.toLocaleString()} read{reads !== 1 ? "s" : ""}</span>
          <span className="opacity-30">•</span>
          <span>{claps.toLocaleString()} clap{claps !== 1 ? "s" : ""}</span>
          <span className="opacity-30">•</span>
          <span>{comments.toLocaleString()} comment{comments !== 1 ? "s" : ""}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#f5f5f7] rounded-lg p-4">
          <div className="text-label mb-2">From readers</div>
          <div className="text-[20px] font-semibold text-[#1d1d1f]">${earnedUsdc.toFixed(3)}</div>
        </div>
        <div className="bg-[#f5f5f7] rounded-lg p-4">
          <div className="text-label mb-2">Balance growth</div>
          <div className="text-[20px] font-semibold text-[#1a8917]">+${yieldEarned.toFixed(4)}</div>
        </div>
      </div>
    </div>
  );
}
