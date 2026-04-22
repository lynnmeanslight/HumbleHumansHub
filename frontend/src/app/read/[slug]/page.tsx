import { ConnectWallet } from "@/components/ConnectWallet";
import { PaymentGate } from "@/components/PaymentGate";
import { fetchArticle } from "@/lib/db";
import { getArticle } from "@/lib/articles";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function renderMarkdown(content: string) {
  return content.split("\n").map((line, i) => {
    if (line.startsWith("### ")) return <h3 key={i} className="text-[17px] font-semibold text-[#1d1d1f] mt-8 mb-2">{line.slice(4)}</h3>;
    if (line.startsWith("## "))  return <h2 key={i} className="text-[22px] font-semibold text-[#1d1d1f] mt-10 mb-3">{line.slice(3)}</h2>;
    if (line.startsWith("# "))   return <h1 key={i} className="text-[28px] font-bold text-[#1d1d1f] mt-10 mb-4">{line.slice(2)}</h1>;
    if (line.startsWith("> "))   return (
      <blockquote key={i} className="border-l-2 border-[#0071e3] pl-4 my-4 text-[15px] text-[#6e6e73] italic">{line.slice(2)}</blockquote>
    );
    if (line.startsWith("---"))  return <hr key={i} className="border-black/[0.08] my-6" />;
    if (!line.trim())             return <div key={i} className="h-3" />;
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong key={j} className="font-semibold text-[#1d1d1f]">{part.slice(2, -2)}</strong>
        : part
    );
    return <p key={i} className="text-[16px] text-[#424245] leading-[1.8] mb-3">{parts}</p>;
  });
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const { slug } = params;

  // Try DB first (user-published), then local MDX (seeded)
  let article: {
    title: string; author: string; author_address?: string; authorAddress?: string;
    category: string; excerpt: string; read_time?: string; readTime?: string;
    date?: string; created_at?: string; content: string; price: number;
  } | null = null;

  try {
    const db = await fetchArticle(slug);
    if (db) article = db;
  } catch {
    // Supabase not configured yet
  }

  if (!article) {
    const local = getArticle(slug);
    if (local) article = local;
  }

  if (!article) notFound();

  const author = article.author;
  const category = article.category;
  const readTime = article.read_time ?? article.readTime ?? "5 min";
  const date = article.created_at?.split("T")[0] ?? article.date ?? "";
  const price = article.price ?? 0.001;

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
          <PaymentGate articleTitle={article.title}>
            <article>{renderMarkdown(article.content)}</article>
          </PaymentGate>
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
