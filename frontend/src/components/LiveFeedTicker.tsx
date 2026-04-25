"use client";

import { useLiveFeed } from "@/hooks/useLiveFeed";

export function LiveFeedTicker() {
  const { events, totalReads, totalVolume, connected, formatAge } = useLiveFeed();

  return (
    <div className="w-full" id="live-feed-ticker">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={connected ? "live-dot" : "w-2 h-2 rounded-full bg-[#86868b]"} />
          <span className="text-[13px] font-medium text-[#1a8917]">{connected ? "Live payments" : "Connecting…"}</span>
        </div>
        <div className="flex items-center gap-5 text-[13px] text-[#86868b]">
          <span><span className="text-[#1d1d1f] font-semibold">{totalReads}</span> reads</span>
          <span><span className="text-[#1a8917] font-semibold">${totalVolume.toFixed(3)}</span> settled</span>
        </div>
      </div>

      <div className="card overflow-hidden max-h-[380px] overflow-y-auto">
        {events.length === 0 ? (
          <div className="px-4 py-10 text-center text-[13px] text-[#86868b]">
            Waiting for live payments…
          </div>
        ) : events.map((item, i) => (
          <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${i === 0 ? "animate-slide-down bg-[#0071e3]/[0.03]" : ""} ${i < events.length - 1 ? "border-b border-black/[0.04]" : ""}`}>
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${i === 0 ? "bg-[#0071e3]" : "bg-black/[0.12]"}`} />
            <div className="flex-1 min-w-0 text-[13px]">
              <span className="text-[#0071e3]">{item.reader}</span>
              <span className="text-[#86868b] mx-1.5">
                {item.eventType === "CLAP" ? "clapped for" : item.eventType === "COMMENT" ? "commented on" : "read"}
              </span>
              <span className="text-[#6e6e73] truncate">&ldquo;{item.article}&rdquo;</span>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="badge badge-positive text-[11px] py-0.5 px-2">${item.amount.toFixed(3)}</span>
              <span className="text-[11px] text-[#86868b] w-20 text-right">{formatAge(item.ageMs)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
