import { NextRequest, NextResponse } from "next/server";
import { saveArticle } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, author, authorAddress, category, excerpt, readTime, content } = body;

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "title and content are required" }, { status: 400 });
  }

  // Generate URL-safe slug from title
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);

  // Append timestamp to guarantee uniqueness
  const slug = `${baseSlug}-${Date.now()}`;

  try {
    await saveArticle({
      slug,
      title: title.trim(),
      author: author || "Anonymous",
      author_address: authorAddress || "0x0000000000000000000000000000000000000000",
      category: category || "General",
      excerpt: excerpt?.trim() || content.replace(/^#+.+\n/gm, "").replace(/\*\*/g, "").trim().slice(0, 140) + "…",
      read_time: readTime || "5 min",
      content,
      price: body.price ? Number(body.price) : 0.001,
    });

    return NextResponse.json({ slug, published: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
