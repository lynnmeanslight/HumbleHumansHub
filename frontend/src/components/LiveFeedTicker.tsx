"use client";

import { useState, useEffect, useCallback } from "react";

interface FeedItem { id: string; reader: string; article: string; amount: string; timeAgo: string; }

const READERS = ["0xAb3…f12","0x7eC…a91","0xD4f…c03","0x91B…e45","0xF2a…b78","0x3cE…d56","0x6aD…f89","0x8bF…g12"];
const ARTICLES = ["Why Micro-Payments Will Replace Subscriptions","The Future of Creator Economy on Web3","Understanding Zero-Knowledge Proofs","DeFi Yield Strategies for 2026","Building on Our Infrastructure: A Developer's Guide","How USYC Makes Idle Funds Work","The Death of the Paywall","Real-Time Settlement: Why Speed Matters"];

function gen(): FeedItem {
  const s = Math.floor(Math.random() * 30);
  return { id: `${Date.now()}-${Math.random()}`, reader: READERS[Math.floor(Math.random() * READERS.length)], article: ARTICLES[Math.floor(Math.random() * ARTICLES.length)], amount: "$0.001", timeAgo: s === 0 ? "just now" : `${s}s ago` };
}

export function LiveFeedTicker() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [reads, setReads] = useState(0);
  const [vol, setVol] = useState(0);

  const add = useCallback(() => {
    setItems(p => [gen(), ...p].slice(0, 50));
    setReads(p => p + 1);
    setVol(p => p + 0.001);
  }, []);

  useEffect(() => {
    const init = Array.from({ length: 8 }, gen);
    setItems(init); setReads(init.length); setVol(init.length * 0.001);
    const iv = setInterval(add, 2000 + Math.random() * 3000);
    return () => clearInterval(iv);
  }, [add]);

  return (
    <div className="w-full" id="live-feed-ticker">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="live-dot" />
          <span className="text-[13px] font-medium text-[#1a8917]">Live on Arc</span>
        </div>
        <div className="flex items-center gap-5 text-[13px] text-[#86868b]">
          <span><span className="text-[#1d1d1f] font-semibold">{reads}</span> reads</span>
          <span><span className="text-[#1a8917] font-semibold">${vol.toFixed(3)}</span> settled</span>
        </div>
      </div>

      <div className="card overflow-hidden max-h-[380px] overflow-y-auto">
        {items.map((item, i) => (
          <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${i === 0 ? "animate-slide-down bg-[#0071e3]/[0.03]" : ""} ${i < items.length - 1 ? "border-b border-black/[0.04]" : ""}`}>
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${i === 0 ? "bg-[#0071e3]" : "bg-black/[0.12]"}`} />
            <div className="flex-1 min-w-0 text-[13px]">
              <span className="text-[#0071e3]">{item.reader}</span>
              <span className="text-[#86868b] mx-1.5">read</span>
              <span className="text-[#6e6e73] truncate">&ldquo;{item.article}&rdquo;</span>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="badge badge-positive text-[11px] py-0.5 px-2">{item.amount}</span>
              <span className="text-[11px] text-[#86868b] w-14 text-right">{item.timeAgo}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
