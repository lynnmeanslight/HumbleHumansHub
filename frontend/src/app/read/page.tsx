import { ConnectWallet } from "@/components/ConnectWallet";
import { fetchAllArticles } from "@/lib/db";
import { prisma } from "@/lib/db";
import Link from "next/link";

// Always fetch fresh — no caching so new articles appear immediately
export const dynamic = "force-dynamic";

export default async function ReadPage() {
  let articles: Awaited<ReturnType<typeof fetchAllArticles>> = [];
  try {
    articles = await fetchAllArticles();
  } catch {
    // DB not configured yet — silently fall through
  }

  // Helper to format date consistently
  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 60) return diffMins <= 1 ? "Just now" : `${diffMins} mins ago`;
      if (diffHours < 24) return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
      if (diffDays < 7) return diffDays === 1 ? "Yesterday" : `${diffDays} days ago`;

      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateString.split("T")[0];
    }
  };

  // Get author names from users table
  // Make sure addresses are mapped case-insensitively
  const authorAddresses = Array.from(new Set(articles.map(a => a.author_address.toLowerCase())));
  const users = await prisma.user.findMany({
    where: { 
      address: { 
        in: authorAddresses,
        mode: 'insensitive' // Ensure we grab the user no matter the casing saved in DB
      } 
    },
    select: { address: true, displayName: true, username: true }
  });

  const userMap = users.reduce((acc, user) => {
    acc[user.address.toLowerCase()] = user;
    return acc;
  }, {} as Record<string, { displayName: string | null; username: string | null }>);

  const items = articles.map(a => {
    const authorAddressLow = a.author_address?.toLowerCase() || "";
    const userProfile = userMap[authorAddressLow];
    
    // Prioritize user profile -> saved author string -> truncated address -> Anonymous
    let displayAuthor = "Anonymous Writer";
    if (userProfile?.displayName) {
      displayAuthor = userProfile.displayName;
    } else if (userProfile?.username) {
      displayAuthor = `@${userProfile.username}`;
    } else if (a.author_address && a.author_address !== "0x0000000000000000000000000000000000000000") {
      displayAuthor = `${a.author_address.slice(0, 6)}...${a.author_address.slice(-4)}`;
    }

    return {
      slug: a.slug,
      title: a.title,
      author: displayAuthor,
      category: a.category,
      excerpt: a.excerpt,
      readTime: a.read_time,
      date: formatDate(a.created_at),
      reads: a.reads,
      price: a.price,
    };
  });

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
              <Link href="/read" className="text-[13px] text-[#1d1d1f] font-medium">Articles</Link>
              <Link href="/writer" className="text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">Publish</Link>
            </div>
          </div>
          <ConnectWallet />
        </div>
      </nav>

      <section className="pt-12">
        <div className="max-w-content mx-auto px-6 py-16 md:py-20 text-center">
          <h1 className="text-hero mb-3">Read</h1>
          <p className="text-[17px] text-[#86868b]">Unlock premium articles. <span className="text-[#0071e3] font-medium">Pay writers directly</span> instantly.</p>
        </div>
      </section>

      <div className="border-y border-black/[0.06]">
        <div className="max-w-content mx-auto px-6 py-3 flex items-center justify-between text-[13px]">
          <div className="flex items-center gap-5 text-[#86868b]">
            <span><span className="text-[#1d1d1f] font-semibold">{items.length}</span> articles</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 text-[#86868b]">
            <span className="live-dot" />
            <span className="text-[11px]">Live payments</span>
          </div>
        </div>
      </div>

      <section className="section-elevated">
        <div className="max-w-content mx-auto px-6 py-10 md:py-14">
          {items.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[17px] text-[#86868b] mb-4">No articles yet.</p>
              <Link href="/writer/new" className="btn-primary">Write the first one →</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map(a => (
                <Link key={a.slug} href={`/read/${a.slug}`} className="card-interactive p-5 block group">
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="badge badge-accent text-[11px] py-0.5">{a.category}</span>
                    <span className="text-[11px] text-[#86868b]">{a.date} • {a.readTime}</span>
                  </div>
                  <h2 className="text-title mb-1.5 group-hover:text-[#0071e3] transition-colors">{a.title}</h2>
                  <p className="text-[14px] text-[#6e6e73] mb-3 line-clamp-2 leading-relaxed">{a.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-[#86868b]">{a.author}</span>
                    <span className="text-[11px] text-[#0071e3] font-medium">${(Number(a.price || 0) + 0.001).toFixed(3)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
