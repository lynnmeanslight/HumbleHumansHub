"use client";

export function WalletBalance() {
  const usdcFloat = 0.01, usycStaked = 0.089, yieldEarned = 0.0002;
  const total = usdcFloat + usycStaked + yieldEarned;

  return (
    <div className="card p-5" id="wallet-balance">
      <div className="flex items-center justify-between mb-4">
        <span className="text-label">Your Balance</span>
        <span className="badge badge-positive text-[11px]">
          <span className="live-dot" />
          Earning
        </span>
      </div>
      <div className="mb-5">
        <div className="text-[32px] font-bold tracking-tight text-[#1d1d1f]">${total.toFixed(4)}</div>
        <div className="text-[13px] text-[#86868b] mt-1">Total Balance</div>
      </div>
      <div>
        {[
          { label: "USDC Float", value: `$${usdcFloat.toFixed(4)}`, dot: "bg-[#0071e3]", color: "text-[#1d1d1f]" },
          { label: "USYC Staked", value: `$${usycStaked.toFixed(4)}`, dot: "bg-[#86868b]", color: "text-[#1d1d1f]" },
          { label: "Yield Earned", value: `+$${yieldEarned.toFixed(4)}`, dot: "bg-[#1a8917]", color: "text-[#1a8917]" },
        ].map((r, i) => (
          <div key={r.label} className={`flex items-center justify-between py-3 ${i < 2 ? "border-b border-black/[0.06]" : ""}`}>
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
