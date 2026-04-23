"use client";

import { ConnectWallet } from "@/components/ConnectWallet";
import { LiveFeedTicker } from "@/components/LiveFeedTicker";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 nav-glass">
        <div className="max-w-content mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-[15px] font-bold text-[#1d1d1f] tracking-tight">HumbleHumansHub</Link>
            <div className="hidden md:flex items-center gap-5">
              <Link href="/read" className="text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">Articles</Link>
              <Link href="/writer" className="text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">Publish</Link>
            </div>
          </div>
          <ConnectWallet />
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-12">
        <div className="max-w-content mx-auto px-6 pt-24 pb-20 md:pt-36 md:pb-28 text-center">
          <div className="badge badge-accent mb-6 inline-flex">
            <span className="live-dot" />
            Live on Arc
          </div>
          <h1 className="text-hero mb-5">
            Pay <span className="text-[#0071e3]">$0.001</span> per read.
            <br />
            <span className="text-[#86868b]">No subscription. No account.</span>
          </h1>
          <p className="text-[17px] text-[#6e6e73] max-w-lg mx-auto mb-10 leading-relaxed">
            Connect your wallet and read. Idle balance earns
            <span className="text-[#1a8917] font-medium"> yield via USYC</span>.
            Writers earn on every click.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/read" className="btn-primary px-7 py-3">Explore Articles</Link>
            <Link href="/writer" className="btn-secondary px-7 py-3">For Creators ›</Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-black/[0.06]">
        <div className="max-w-content mx-auto px-6 py-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { val: "$0.001", label: "Per article read", color: "text-[#1d1d1f]" },
              { val: "<1s", label: "Settlement time", color: "text-[#1d1d1f]" },
              { val: "USYC", label: "Yield on idle balance", color: "text-[#1a8917]" },
            ].map(s => (
              <div key={s.label}>
                <div className={`text-[36px] font-bold tracking-tight ${s.color}`}>{s.val}</div>
                <div className="text-[14px] text-[#86868b] mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section-elevated">
        <div className="max-w-content mx-auto px-6 py-20 md:py-24">
          <h2 className="text-heading text-center mb-14">How it works.</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { n: "01", title: "Connect", desc: "Link your wallet. No sign-up." },
              { n: "02", title: "Deposit", desc: "Add USDC. Auto-stakes into USYC." },
              { n: "03", title: "Read", desc: "Click any article. $0.001 settles instantly." },
              { n: "04", title: "Earn", desc: "Writers auto-compound. Withdraw anytime." },
            ].map(s => (
              <div key={s.n} className="card-interactive p-6 text-center">
                <div className="text-[12px] font-semibold text-[#0071e3] mb-3">{s.n}</div>
                <h3 className="text-title mb-2">{s.title}</h3>
                <p className="text-[14px] text-[#6e6e73] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Our Infrastructure */}
      <section className="section-primary">
        <div className="max-w-content mx-auto px-6 py-20 md:py-24">
          <h2 className="text-heading text-center mb-3">Why it works.</h2>
          <p className="text-[16px] text-[#86868b] text-center mb-14 max-w-md mx-auto">
            The economics are impossible on any other chain.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <div className="card p-5">
              <div className="text-label mb-4">Ethereum L1</div>
              <div className="space-y-2 text-[14px]">
                <div className="flex justify-between"><span className="text-[#86868b]">Read price</span><span className="text-[#1d1d1f]">$0.001</span></div>
                <div className="flex justify-between"><span className="text-[#86868b]">Gas cost</span><span className="text-red-500">$0.50–$2.00</span></div>
                <div className="h-px bg-black/[0.06]" />
                <div className="flex justify-between"><span className="text-[#86868b]">Overhead</span><span className="text-red-500 font-semibold">500–2000×</span></div>
              </div>
              <div className="mt-3 text-[12px] text-[#86868b]">✕ Economically impossible</div>
            </div>
            <div className="card p-5 border-[#1a8917]/20">
              <div className="text-label mb-4 !text-[#1a8917]">Our Infrastructure</div>
              <div className="space-y-2 text-[14px]">
                <div className="flex justify-between"><span className="text-[#86868b]">Read price</span><span className="text-[#1d1d1f]">$0.001</span></div>
                <div className="flex justify-between"><span className="text-[#86868b]">Gas cost</span><span className="text-[#1a8917]">&lt;$0.0001</span></div>
                <div className="h-px bg-black/[0.06]" />
                <div className="flex justify-between"><span className="text-[#86868b]">Overhead</span><span className="text-[#1a8917] font-semibold">&lt;10%</span></div>
              </div>
              <div className="mt-3 text-[12px] text-[#1a8917]">✓ Viable at scale</div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Feed */}
      <section className="section-elevated">
        <div className="max-w-content mx-auto px-6 py-20 md:py-24">
          <h2 className="text-heading text-center mb-3">Live feed.</h2>
          <p className="text-[16px] text-[#86868b] text-center mb-12 max-w-md mx-auto">Every read settles instantly.</p>
          <LiveFeedTicker />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/[0.06]">
        <div className="max-w-content mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-[13px] text-[#86868b]">HumbleHumansHub — Agentic Economy on Arc Hackathon</span>
          <span className="text-[13px] text-[#86868b]">Powered by Circle + USYC</span>
        </div>
      </footer>
    </div>
  );
}
