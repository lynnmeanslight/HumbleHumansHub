import { ConnectWallet } from "@/components/ConnectWallet";
import { PaymentGate } from "@/components/PaymentGate";
import { fetchArticle } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  console.log(`[ArticlePage] Rendering slug: ${slug}`);

  // Fetch metadata only
  let article: any = null;
  let errorMsg: string | null = null;
  let availableSlugs: string[] = [];
  let currentDb: string | null = null;

  try {
    const db = await fetchArticle(slug);
    if (db && db.id !== "none") {
      const { content: _content, ...meta } = db;
      article = meta;
    } else {
      errorMsg = "Slug match failed";
      availableSlugs = (db as any)?.availableSlugs || [];
      currentDb = (db as any)?.currentDb || null;
    }
  } catch (err) {
    console.error(`[ArticlePage] DB fetch error for ${slug}:`, err);
    errorMsg = err instanceof Error ? err.message : "Database connection failed";
  }

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-3xl font-bold text-[#1d1d1f] mb-4">Article Not Found</h1>
        <div className="bg-gray-50 border border-black/[0.06] rounded-xl p-8 max-w-lg w-full">
          <p className="text-[#86868b] mb-4 text-sm uppercase tracking-widest font-semibold">Diagnostic Info</p>
          <div className="space-y-3 text-left">
            {currentDb && (
              <div className="flex justify-between border-b border-black/[0.04] pb-2">
                <span className="text-[#86868b] text-[13px]">Current DB:</span>
                <span className="text-[#1d1d1f] text-[13px] font-mono">{currentDb}</span>
              </div>
            )}
            <div className="flex justify-between border-b border-black/[0.04] pb-2">
              <span className="text-[#86868b] text-[13px]">Requested Slug:</span>
              <span className="text-[#1d1d1f] text-[13px] font-mono font-bold">"{slug}"</span>
            </div>
            <div className="flex justify-between border-b border-black/[0.04] pb-2">
              <span className="text-[#86868b] text-[13px]">Slug Length:</span>
              <span className="text-[#1d1d1f] text-[13px] font-mono">{slug.length} characters</span>
            </div>
            <div className="flex justify-between border-b border-black/[0.04] pb-2">
              <span className="text-[#86868b] text-[13px]">Reason:</span>
              <span className="text-red-500 text-[13px] font-medium">{errorMsg}</span>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-[#86868b] text-[13px] mb-3 text-left">Available Slugs in DB:</p>
            <div className="flex flex-wrap gap-2">
              {availableSlugs.length === 0 ? (
                <span className="text-[12px] text-red-400 italic">Database is empty!</span>
              ) : (
                availableSlugs.map(s => (
                  <Link key={s} href={`/read/${s}`} className="px-3 py-1 bg-white border border-black/[0.08] rounded-full text-[12px] text-[#0071e3] hover:border-[#0071e3] transition-colors">
                    {s}
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
        <Link href="/read" className="btn-primary mt-10">Back to Article List</Link>
      </div>
    );
  }

  const author = article.author;
  const category = article.category;
  const readTime = article.read_time ?? article.readTime ?? "5 min";
  const date = article.created_at?.split("T")[0] ?? article.date ?? "";
  const price = article.price ?? 0.001;
  const writerAddress = (article.author_address ?? article.authorAddress ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;

  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 w-full z-50 nav-glass">
        <div className="max-w-content mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 text-[15px] font-bold text-[#1d1d1f] tracking-tight">
              <img src="/logo.png" alt="Logo" className="h-6 w-auto object-contain" />
              HumbleHumansHub
            </Link>
            <Link href="/read" className="text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">‹ Articles</Link>
          </div>
          <ConnectWallet />
        </div>
      </nav>

      <section className="pt-12">
        <div className="max-w-[680px] mx-auto px-6 py-14 md:py-20 text-center">
          <div className="flex items-center justify-center gap-2.5 mb-4">
            <span className="badge badge-accent text-[11px]">{category}</span>
            <span className="text-[12px] text-[#86868b]">{readTime}</span>
            {date && <span className="text-[12px] text-[#86868b]">{date}</span>}
          </div>
          <h1 className="text-heading mb-4">{article.title}</h1>
          <p className="text-[15px] text-[#6e6e73]">{author}</p>
        </div>
      </section>

      <section className="section-elevated">
        <div className="max-w-[680px] mx-auto px-6 py-10 md:py-14">
          <PaymentGate 
            articleTitle={article.title} 
            authorName={author} 
            price={`$${price}`} 
            slug={slug} 
            writerAddress={writerAddress} 
          />
          
          <div className="mt-10 h-px bg-black/[0.06]" />
          <div className="mt-4 flex items-center gap-2.5">
            <span className="text-[13px] text-[#1a8917] font-medium">✓ Settled</span>
            <span className="text-[12px] text-[#86868b]">${price.toFixed(3)} {author}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
