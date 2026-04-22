"use client";
import { ConnectWallet } from "@/components/ConnectWallet";
import { WriterEarnings } from "@/components/WriterEarnings";
import Link from "next/link";

const ARTS = [
  { title: "Why Micro-Payments Will Replace Subscriptions", reads: 142, earned: 0.142, yield: 0.0034 },
  { title: "The Death of the Paywall", reads: 301, earned: 0.301, yield: 0.0071 },
  { title: "Real-Time Settlement: Why Speed Matters", reads: 95, earned: 0.095, yield: 0.0023 },
];
const RECENT = [
  { reader: "0xAb3…f12", article: "Why Micro-Payments…", amount: 0.001, time: "2s ago" },
  { reader: "0x7eC…a91", article: "The Death of the Paywall", amount: 0.001, time: "15s ago" },
  { reader: "0xD4f…c03", article: "Real-Time Settlement…", amount: 0.001, time: "32s ago" },
  { reader: "0x91B…e45", article: "Why Micro-Payments…", amount: 0.001, time: "1m ago" },
  { reader: "0xF2a…b78", article: "The Death of the Paywall", amount: 0.001, time: "2m ago" },
];

export default function WriterDashboard() {
  const tReads = ARTS.reduce((s, a) => s + a.reads, 0);
  const tEarned = ARTS.reduce((s, a) => s + a.earned, 0);
  const tYield = ARTS.reduce((s, a) => s + a.yield, 0);

  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 w-full z-50 nav-glass">
        <div className="max-w-content mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-[15px] font-bold text-[#1d1d1f] tracking-tight">HumbleHumansHub</Link>
            <div className="hidden md:flex items-center gap-5">
              <Link href="/read" className="text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">Articles</Link>
              <Link href="/writer" className="text-[13px] text-[#1d1d1f] font-medium">Publish</Link>
              <Link href="/wallet" className="text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">Account</Link>
            </div>
          </div>
          <ConnectWallet />
        </div>
      </nav>

      <section className="pt-12">
        <div className="max-w-content mx-auto px-6 py-14 md:py-20 text-center">
          <h1 className="text-hero mb-3">Dashboard.</h1>
          <p className="text-[17px] text-[#86868b] mb-6">Every read pays <span className="text-[#0071e3]">$0.001</span> + yield.</p>
          <Link href="/writer/new" className="btn-primary inline-flex gap-2 px-6 py-2.5" id="new-article-btn">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Article
          </Link>
        </div>
      </section>

      <div className="border-y border-black/[0.06]">
        <div className="max-w-content mx-auto px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-5">
          {[
            { lb: "Total Reads", v: tReads.toLocaleString(), c: "text-[#1d1d1f]" },
            { lb: "Revenue", v: `$${tEarned.toFixed(3)}`, c: "text-[#1d1d1f]" },
            { lb: "Yield", v: `+$${tYield.toFixed(4)}`, c: "text-[#1a8917]" },
            { lb: "Total", v: `$${(tEarned + tYield).toFixed(4)}`, c: "text-[#1d1d1f]" },
          ].map(s => (
            <div key={s.lb}>
              <div className="text-label mb-1">{s.lb}</div>
              <div className={`text-[22px] font-bold tracking-tight ${s.c}`}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      <section className="section-elevated">
        <div className="max-w-content mx-auto px-6 py-10 md:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <WriterEarnings />
              <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-black/[0.06]"><span className="text-label">Article Performance</span></div>
                {ARTS.map((a, i) => (
                  <div key={a.title} className={`px-5 py-4 ${i < ARTS.length - 1 ? "border-b border-black/[0.06]" : ""}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-[14px] text-[#1d1d1f] font-medium">{a.title}</div>
                        <div className="text-[12px] text-[#86868b] mt-0.5">{a.reads} reads</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[14px] text-[#1d1d1f]">${a.earned.toFixed(3)}</div>
                        <div className="text-[12px] text-[#1a8917]">+${a.yield.toFixed(4)}</div>
                      </div>
                    </div>
                    <div className="h-1 bg-black/[0.04] rounded-full overflow-hidden">
                      <div className="h-full bg-[#0071e3] rounded-full transition-all" style={{ width: `${(a.reads / 301) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="card p-5">
                <span className="text-label">Publish</span>
                <p className="text-[13px] text-[#86868b] mt-2 mb-4 leading-relaxed">Write an article and start earning $0.001 per read instantly.</p>
                <Link href="/writer/new" className="btn-primary w-full flex items-center justify-center gap-2" id="new-article-card-btn">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  New Article
                </Link>
              </div>
              <div className="card p-5">
                <span className="text-label">Withdraw</span>
                <div className="mt-3 mb-4">
                  <div className="text-[12px] text-[#86868b] mb-1">Available (USYC)</div>
                  <div className="text-[22px] font-bold text-[#1d1d1f]">${(tEarned + tYield).toFixed(4)}</div>
                </div>
                <button className="btn-primary w-full" id="withdraw-btn">Withdraw Funds</button>
                <p className="text-[11px] text-[#86868b] mt-2.5 text-center">USYC → USDC via Teller</p>
              </div>
              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-black/[0.06] flex items-center justify-between">
                  <span className="text-label">Recent</span>
                  <span className="live-dot" />
                </div>
                {RECENT.map((p, i) => (
                  <div key={i} className={`px-4 py-2.5 ${i < RECENT.length - 1 ? "border-b border-black/[0.06]" : ""}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[12px] text-[#0071e3]">{p.reader}</div>
                        <div className="text-[11px] text-[#86868b]">{p.article}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[12px] text-[#1a8917]">+${p.amount.toFixed(3)}</div>
                        <div className="text-[11px] text-[#86868b]">{p.time}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
