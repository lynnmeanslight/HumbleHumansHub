import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@/lib/x402";
import { fetchArticle } from "@/lib/db";

/**
 * GET /api/articles/[slug]
 *
 * x402-gated article content delivery.
 * Returns 402 if no valid payment; serves full article content if payment verified.
 * Article is fetched once and passed to the handler via closure.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;
  console.log(`[API /articles/${slug}] Received request`);

  let writerAddress: `0x${string}` = "0x0000000000000000000000000000000000000000";
  let content: string | null = null;
  let comments: any[] = [];

  try {
    const article = await fetchArticle(slug);
    if (article) {
      content = article.content;
      comments = article.comments || [];
      if (article.author_address) {
        writerAddress = article.author_address as `0x${string}`;
      }
    }
  } catch (err) {
    console.error("[articles/route] DB fetch failed:", err);
  }

  if (content === null) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  const gatedHandler = withX402(
    (_req, { payer }) =>
      Promise.resolve(
        NextResponse.json({
          slug,
          content,
          comments,
          unlocked: true,
          payer,
          price: "0.001",
          currency: "USDC",
          settledAt: new Date().toISOString(),
        })
      ),
    writerAddress,
    slug
  );

  return gatedHandler(request);
}
