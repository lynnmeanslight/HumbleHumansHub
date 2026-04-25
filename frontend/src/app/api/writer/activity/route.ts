import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 });
  }

  try {
    // Fetch last 50 events where this address is the writer
    const events = await prisma.articleReadEvent.findMany({
      where: { writerAddress: { equals: address, mode: "insensitive" } },
      orderBy: { observedAt: "desc" },
      take: 50,
    });

    if (events.length === 0) {
      return NextResponse.json({ activity: [] });
    }

    // Get unique slugs and reader addresses
    const slugs = Array.from(new Set(events.map(e => e.articleSlug)));
    const readerAddrs = Array.from(new Set(events.map(e => e.reader.toLowerCase())));

    // Fetch articles to get titles
    const articles = await prisma.article.findMany({
      where: { slug: { in: slugs } },
      select: { slug: true, title: true }
    });
    const articleMap = articles.reduce((acc, a) => {
      acc[a.slug] = a.title;
      return acc;
    }, {} as Record<string, string>);

    // Fetch users to get names
    const users = await prisma.user.findMany({
      where: { address: { in: readerAddrs, mode: "insensitive" } },
      select: { address: true, displayName: true, username: true }
    });
    const userMap = users.reduce((acc, u) => {
      acc[u.address.toLowerCase()] = u;
      return acc;
    }, {} as Record<string, any>);

    // Map the events to a nice UI format
    const activity = events.map(e => {
      const u = userMap[e.reader.toLowerCase()];
      let readerName = `${e.reader.slice(0, 6)}...${e.reader.slice(-4)}`;
      if (u?.displayName) {
        readerName = u.displayName;
      } else if (u?.username) {
        readerName = `@${u.username}`;
      }

      return {
        id: e.id,
        type: e.eventType, // "READ", "CLAP", "COMMENT"
        readerName,
        readerAddress: e.reader,
        articleTitle: articleMap[e.articleSlug] || e.articleSlug,
        slug: e.articleSlug,
        amount: Number(e.amount),
        date: e.observedAt.toISOString(),
      };
    });

    return NextResponse.json({ activity });
  } catch (err) {
    console.error("[api/writer/activity] GET failed:", err);
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
  }
}
