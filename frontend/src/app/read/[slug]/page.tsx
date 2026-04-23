import { ConnectWallet } from "@/components/ConnectWallet";
import { PaymentGate } from "@/components/PaymentGate";
import { fetchArticle } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const { slug } = params;

  // Fetch metadata only — content is never sent to the client before payment.
  let article: {
    title: string; author: string; author_address?: string; authorAddress?: string;
    category: string; excerpt: string; read_time?: string; readTime?: string;
    date?: string; created_at?: string; price: number;
  } | null = null;

  try {
    const db = await fetchArticle(slug);
    if (db) {
      // Destructure content out so it is never included in the rendered HTML.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { content: _content, ...meta } = db;
      article = meta;
    }
  } catch {
    // DB not configured yet
  }

  if (!article) notFound();

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
            <Link href="/" className="text-[15px] font-bold text-[#1d1d1f] tracking-tight">HumbleHumansHub</Link>
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
          <PaymentGate articleTitle={article.title} authorName={author} slug={slug} writerAddress={writerAddress} />
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
