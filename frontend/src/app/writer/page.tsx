"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectWallet } from "@/components/ConnectWallet";
import Link from "next/link";

interface ArticleRow {
  id: string;
  slug: string;
  title: string;
  category: string;
  reads: number;
  created_at: string;
}

interface ActivityEvent {
  id: string;
  type: string;
  readerName: string;
  readerAddress: string;
  articleTitle: string;
  slug: string;
  amount: number;
  date: string;
}

export default function WriterDashboard() {
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);

  const { address } = useAccount();

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

  // Fetch recent activity on these articles
  useEffect(() => {
    if (!address) { setActivity([]); return; }
    setActivityLoading(true);
    fetch(`/api/writer/activity?address=${address}`)
      .then(r => r.json())
      .then(data => setActivity(data.activity ?? []))
      .catch(() => setActivity([]))
      .finally(() => setActivityLoading(false));
  }, [address]);

  const formatType = (type: string) => {
    if (type === "READ") return { label: "Read", color: "text-[#0071e3]", bg: "bg-[#0071e3]/10" };
    if (type === "CLAP") return { label: "Clapped", color: "text-[#1a8917]", bg: "bg-[#1a8917]/10" };
    if (type === "COMMENT") return { label: "Commented", color: "text-amber-600", bg: "bg-amber-100" };
    return { label: type, color: "text-[#86868b]", bg: "bg-gray-100" };
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    if (diffMins < 60) return diffMins <= 1 ? "Just now" : `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 w-full z-50 nav-glass">
        <div className="max-w-content mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 text-[15px] font-bold text-[#1d1d1f] tracking-tight">
              <img src="/logo.png" alt="Logo" className="h-6 w-auto object-contain" />
              HumbleHumansHub
            </Link>
            <div className="hidden md:flex items-center gap-5">
              <Link href="/read" className="text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">Articles</Link>
              <Link href="/writer" className="text-[13px] text-[#1d1d1f] font-medium">Publish</Link>
            </div>
          </div>
          <ConnectWallet />
        </div>
      </nav>

      <section className="pt-12 border-b border-black/[0.06]">
        <div className="max-w-content mx-auto px-6 py-14 md:py-20 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-hero mb-3">Publish</h1>
            <p className="text-[17px] text-[#86868b]">Manage your written articles and publish new ones.</p>
          </div>
          <Link href="/writer/new" className="btn-primary inline-flex gap-2 px-6 py-2.5" id="new-article-btn">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Article
          </Link>
        </div>
      </section>

      <section className="section-elevated min-h-[50vh]">
        <div className="max-w-content mx-auto px-6 py-10 md:py-14 grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-[20px] font-bold text-[#1d1d1f] tracking-tight pl-1">Your Articles</h2>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-[20px] font-bold text-[#1d1d1f] tracking-tight pl-1">Recent Activity</h2>
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-black/[0.06]">
                <span className="text-label">Live Audience Events</span>
              </div>
              
              {!address ? (
                <div className="px-5 py-8 text-center text-[13px] text-[#86868b]">Connect wallet to see activity.</div>
              ) : activityLoading ? (
                <div className="px-5 py-8 text-center text-[13px] text-[#86868b]">Loading activity…</div>
              ) : activity.length === 0 ? (
                <div className="px-5 py-8 text-center text-[13px] text-[#86868b]">No recent activity on your articles.</div>
              ) : (
                <div className="divide-y divide-black/[0.04]">
                  {activity.map(ev => {
                    const style = formatType(ev.type);
                    return (
                      <div key={ev.id} className="p-4 hover:bg-[#fbfbfd] transition-colors">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-[#1d1d1f]">{ev.readerName}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${style.color} ${style.bg}`}>
                              {style.label}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#86868b] whitespace-nowrap ml-2">{formatDate(ev.date)}</span>
                        </div>
                        <Link href={`/read/${ev.slug}`} className="block text-[12px] text-[#6e6e73] hover:text-[#0071e3] transition-colors line-clamp-1">
                          on &ldquo;{ev.articleTitle}&rdquo;
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
