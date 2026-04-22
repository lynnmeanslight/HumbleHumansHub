"use client";
import { useState } from "react";
import { ConnectWallet } from "@/components/ConnectWallet";
import { WalletBalance } from "@/components/WalletBalance";
import Link from "next/link";

const TX = [
  { type: "deposit", amount: 0.1, desc: "Deposited USDC", time: "10m ago", status: "confirmed" },
  { type: "stake", amount: 0.09, desc: "Auto-staked to USYC", time: "10m ago", status: "confirmed" },
  { type: "read", amount: -0.001, desc: "Read: Why Micro-Payments…", time: "8m ago", status: "confirmed" },
  { type: "read", amount: -0.001, desc: "Read: The Future of Creator…", time: "6m ago", status: "confirmed" },
  { type: "read", amount: -0.001, desc: "Read: Understanding ZKPs", time: "3m ago", status: "confirmed" },
  { type: "yield", amount: 0.0002, desc: "USYC yield accrued", time: "1m ago", status: "pending" },
];

const ICONS: Record<string, JSX.Element> = {
  deposit: <svg className="w-3.5 h-3.5 text-[#0071e3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>,
  stake: <svg className="w-3.5 h-3.5 text-[#1a8917]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>,
  read: <svg className="w-3.5 h-3.5 text-[#86868b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>,
  yield: <svg className="w-3.5 h-3.5 text-[#0071e3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>,
};

export default function WalletPage() {
  const [amt, setAmt] = useState("");

  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 w-full z-50 nav-glass">
        <div className="max-w-content mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-[15px] font-bold text-[#1d1d1f] tracking-tight">HumbleHumansHub</Link>
            <div className="hidden md:flex items-center gap-5">
              <Link href="/read" className="text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">Articles</Link>
              <Link href="/writer" className="text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">Publish</Link>
              <Link href="/wallet" className="text-[13px] text-[#1d1d1f] font-medium">Account</Link>
            </div>
          </div>
          <ConnectWallet />
        </div>
      </nav>

      <section className="pt-12">
        <div className="max-w-content mx-auto px-6 py-14 md:py-20 text-center">
          <h1 className="text-hero mb-3">Wallet.</h1>
          <p className="text-[17px] text-[#86868b]">Deposit, earn yield, pay <span className="text-[#0071e3]">$0.001</span> per read.</p>
        </div>
      </section>

      <section className="section-elevated">
        <div className="max-w-content mx-auto px-6 py-10 md:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-4">
              <WalletBalance />
              <div className="card p-5">
                <span className="text-label">Deposit USDC</span>
                <div className="mt-3 space-y-3">
                  <div className="relative">
                    <input type="number" value={amt} onChange={e => setAmt(e.target.value)} placeholder="0.10" step="0.01" min="0.01"
                      className="w-full px-4 py-2.5 rounded-lg bg-[#f5f5f7] border border-black/[0.08] text-[#1d1d1f] placeholder-[#86868b] text-[14px] focus:outline-none focus:border-[#0071e3]/50 focus:ring-1 focus:ring-[#0071e3]/20 transition-all"
                      id="deposit-amount-input" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#86868b]">$</span>
                  </div>
                  <div className="flex gap-1.5">
                    {["0.05","0.10","0.50","1.00"].map(v => (
                      <button key={v} onClick={() => setAmt(v)} className="flex-1 py-1.5 text-[11px] text-[#6e6e73] bg-[#f5f5f7] border border-black/[0.06] rounded-lg hover:border-black/[0.15] hover:text-[#1d1d1f] transition-all">${v}</button>
                    ))}
                  </div>
                  {amt && Number(amt) > 0 && (
                    <div className="p-3 rounded-lg bg-[#f5f5f7] border border-black/[0.06] space-y-1.5">
                      <div className="text-[11px] text-[#86868b]">Allocation:</div>
                      <div className="flex justify-between text-[12px]"><span className="text-[#6e6e73]">Available Balance</span><span className="text-[#1d1d1f]">$0.01</span></div>
                      <div className="flex justify-between text-[12px]"><span className="text-[#6e6e73]">→ USYC</span><span className="text-[#1a8917]">${Math.max(0, Number(amt) - 0.01).toFixed(4)}</span></div>
                    </div>
                  )}
                  <button className="btn-accent w-full" id="deposit-btn">Deposit</button>
                </div>
              </div>
              <div className="card p-5">
                <span className="text-label">Withdraw</span>
                <button className="btn-secondary w-full mt-3" id="withdraw-reader-btn">Withdraw to USDC</button>
                <p className="text-[11px] text-[#86868b] mt-2 text-center">USYC → USDC instantly</p>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-black/[0.06] flex items-center justify-between">
                  <span className="text-label">Transactions</span>
                  <span className="text-[11px] text-[#86868b]">Settled Instantly</span>
                </div>
                {TX.map((tx, i) => (
                  <div key={i} className={`px-5 py-3.5 flex items-center gap-3.5 ${i < TX.length - 1 ? "border-b border-black/[0.06]" : ""}`}>
                    <div className="w-8 h-8 rounded-lg bg-[#f5f5f7] border border-black/[0.06] flex items-center justify-center flex-shrink-0">
                      {ICONS[tx.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] text-[#1d1d1f]">{tx.desc}</div>
                      <div className="text-[11px] text-[#86868b] mt-0.5">{tx.time}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`text-[14px] font-medium ${tx.amount > 0 ? "text-[#1a8917]" : "text-[#1d1d1f]"}`}>
                        {tx.amount > 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(4)}
                      </div>
                      <div className={`text-[11px] ${tx.status === "pending" ? "text-[#0071e3]" : "text-[#86868b]"}`}>{tx.status}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="card p-5">
                <h3 className="text-title mb-4">How it works.</h3>
                <div className="space-y-3">
                  {["Deposit USDC — $0.01 stays available for instant reads.","Rest auto-stakes into USYC — earning 5% yield while you browse.","Each read redeems $0.001 USYC → USDC — settled atomically on Arc."].map((t, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#0071e3] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[10px] text-white font-bold">{i + 1}</span>
                      </div>
                      <p className="text-[14px] text-[#6e6e73] leading-relaxed">{t}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
