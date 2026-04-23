"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectWallet } from "@/components/ConnectWallet";
import { WriterEarnings } from "@/components/WriterEarnings";
import { useWriterVault } from "@/hooks/useWriterVault";
import Link from "next/link";

interface ArticleRow {
  id: string;
  slug: string;
  title: string;
  category: string;
  reads: number;
  created_at: string;
}

export default function WriterDashboard() {
  const [txMsg, setTxMsg] = useState<string | null>(null);
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);

  const { isConnected, address } = useAccount();
  const {
    estimatedUsdc,
    lifetimeUsdc,
    totalReads,
    withdraw,
    isWithdrawing,
    isWithdrawSuccess,
    refetchEarnings,
    isOnArc,
    switchToArc,
  } = useWriterVault();

  const pendingUsdc  = Number(estimatedUsdc)  / 1e18;
  const earnedUsdc   = Number(lifetimeUsdc)   / 1e18;
  const yieldEarned  = Math.max(0, pendingUsdc - earnedUsdc);
  const reads        = Number(totalReads);

  // Fetch this writer's articles
  useEffect(() => {
    if (!address) { setArticles([]); return; }
    setArticlesLoading(true);
    fetch(`/api/articles/by-author?address=${address}`)
      .then(r => r.json())
      .then(data => setArticles(data.articles ?? []))
      .catch(() => setArticles([]))
      .finally(() => setArticlesLoading(false));
  }, [address]);

  useEffect(() => {
    if (!isWithdrawSuccess) return;
    refetchEarnings();
    setTxMsg("Withdrawal confirmed ✓");
    setTimeout(() => setTxMsg(null), 4000);
  }, [isWithdrawSuccess]);

  const handleWithdraw = () => {
    if (!isOnArc) { switchToArc(); return; }
    withdraw();
  };

  const stats = [
    { lb: "Total Reads", v: isConnected ? reads.toLocaleString()      : "—", c: "text-[#1d1d1f]" },
    { lb: "Revenue",     v: isConnected ? `$${earnedUsdc.toFixed(3)}`  : "—", c: "text-[#1d1d1f]" },
    { lb: "Yield",       v: isConnected ? `+$${yieldEarned.toFixed(4)}`: "—", c: "text-[#1a8917]" },
    { lb: "Total",       v: isConnected ? `$${pendingUsdc.toFixed(4)}`  : "—", c: "text-[#1d1d1f]" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 w-full z-50 nav-glass">
        <div className="max-w-content mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-[15px] font-bold text-[#1d1d1f] tracking-tight">HumbleHumansHub</Link>
            <div className="hidden md:flex items-center gap-5">
              <Link href="/read" className="text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">Articles</Link>
              <Link href="/writer" className="text-[13px] text-[#1d1d1f] font-medium">Publish</Link>
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
          {stats.map(s => (
            <div key={s.lb}>
              <div className="text-label mb-1">{s.lb}</div>
              <div className={`text-[22px] font-bold tracking-tight ${s.c}`}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      <section className="section-elevated">
        <div className="max-w-content mx-auto px-6 py-10 md:py-14">
          {txMsg && (
            <div className="mb-4 px-4 py-3 bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl text-[13px] text-[#1a8917] font-medium text-center">
              {txMsg}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <WriterEarnings />
              <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-black/[0.06] flex items-center justify-between">
                  <span className="text-label">Article Performance</span>
                  <Link href="/writer/new" className="text-[11px] text-[#0071e3] hover:underline">+ New</Link>
                </div>
                {articlesLoading ? (
                  <div className="px-5 py-10 text-center text-[13px] text-[#86868b]">Loading…</div>
                ) : articles.length === 0 ? (
                  <div className="px-5 py-10 text-center text-[13px] text-[#86868b]">
                    No articles yet. <Link href="/writer/new" className="text-[#0071e3]">Write your first →</Link>
                  </div>
                ) : (
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-black/[0.06] text-left">
                        <th className="px-5 py-2.5 text-label font-medium">Title</th>
                        <th className="px-3 py-2.5 text-label font-medium">Category</th>
                        <th className="px-3 py-2.5 text-label font-medium text-right">Reads</th>
                        <th className="px-5 py-2.5 text-label font-medium text-right">Published</th>
                      </tr>
                    </thead>
                    <tbody>
                      {articles.map(a => (
                        <tr key={a.id} className="border-b border-black/[0.04] hover:bg-[#f5f5f7] transition-colors">
                          <td className="px-5 py-3">
                            <Link href={`/read/${a.slug}`} className="text-[#0071e3] hover:underline line-clamp-1">{a.title}</Link>
                          </td>
                          <td className="px-3 py-3 text-[#6e6e73]">{a.category}</td>
                          <td className="px-3 py-3 text-right font-medium">{a.reads.toLocaleString()}</td>
                          <td className="px-5 py-3 text-right text-[#86868b]">
                            {new Date(a.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="card p-5">
                <span className="text-label">Publish</span>
                <p className="text-[13px] text-[#86868b] mt-2 mb-4 leading-relaxed">
                  Write an article and start earning $0.001 per read instantly.
                </p>
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
                  <div className="text-[12px] text-[#86868b] mb-1">Available to withdraw</div>
                  <div className="text-[22px] font-bold text-[#1d1d1f]">
                    {isConnected ? `$${pendingUsdc.toFixed(4)}` : "—"}
                  </div>
                  <div className="text-[11px] text-[#86868b] mt-0.5">USYC balance (est. USDC)</div>
                </div>
                <button
                  onClick={handleWithdraw}
                  disabled={!isConnected || (isOnArc && pendingUsdc === 0) || isWithdrawing}
                  className="btn-primary w-full disabled:opacity-50"
                  id="withdraw-btn"
                >
                  {isWithdrawing ? "Withdrawing…" : !isOnArc ? "Switch to Arc Testnet" : "Withdraw Funds"}
                </button>
                <p className="text-[11px] text-[#86868b] mt-2.5 text-center">USYC → USDC via Teller</p>
              </div>

              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-black/[0.06] flex items-center justify-between">
                  <span className="text-label">Recent</span>
                  <span className="live-dot" />
                </div>
                <div className="px-4 py-8 text-center text-[12px] text-[#86868b]">
                  {isConnected ? "No recent activity" : "Connect wallet to view activity"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
