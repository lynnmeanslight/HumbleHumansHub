"use client";

export function WriterEarnings() {
  const reads = 347, earned = 0.347, yieldEarned = 0.0089;
  const total = earned + yieldEarned;

  return (
    <div className="card p-5" id="writer-earnings">
      <div className="flex items-center justify-between mb-4">
        <span className="text-label">Writer Earnings</span>
        <span className="badge badge-positive text-[11px]">+2.5% yield</span>
      </div>
      <div className="mb-5">
        <div className="text-[32px] font-bold tracking-tight text-[#1d1d1f]">${total.toFixed(4)}</div>
        <div className="text-[13px] text-[#86868b] mt-1">From {reads.toLocaleString()} reads</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#f5f5f7] rounded-lg p-4">
          <div className="text-label mb-2">Content</div>
          <div className="text-[20px] font-semibold text-[#1d1d1f]">${earned.toFixed(3)}</div>
        </div>
        <div className="bg-[#f5f5f7] rounded-lg p-4">
          <div className="text-label mb-2">Yield</div>
          <div className="text-[20px] font-semibold text-[#1a8917]">+${yieldEarned.toFixed(4)}</div>
        </div>
      </div>
    </div>
  );
}
