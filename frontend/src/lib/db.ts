import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

console.log(`[db.ts] Initializing Prisma with DB: ${process.env.DATABASE_URL?.split('@')[1] || 'unknown'}`);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DbComment {
  id: string;
  content: string;
  author: string;
  author_addr: string;
  article_slug: string;
  tx_hash: string | null;
  created_at: string;
}

export interface DbArticle {
  id: string;
  slug: string;
  title: string;
  author: string;
  author_address: string;
  category: string;
  excerpt: string;
  read_time: string;
  content: string;
  price: number;
  reads: number;
  created_at: string;
  comments?: DbComment[];
}

export interface DbArticleReadEvent {
  id: string;
  tx_hash: string;
  log_index: number;
  block_number: bigint;
  reader: string;
  writer_address: string;
  article_slug: string;
  amount: number;
  observed_at: string;
  created_at: string;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Save a new article to PostgreSQL via Prisma */
export async function saveArticle(article: Omit<DbArticle, "id" | "reads" | "created_at">): Promise<{ slug: string }> {
  const created = await prisma.article.create({
    data: {
      slug: article.slug,
      title: article.title,
      author: article.author,
      authorAddress: article.author_address,
      category: article.category,
      excerpt: article.excerpt,
      readTime: article.read_time,
      content: article.content,
      price: article.price,
    },
    select: { slug: true }
  });

  return { slug: created.slug };
}

/** Fetch a single article by slug */
export async function fetchArticle(slug: string): Promise<DbArticle & { availableSlugs?: string[] } | null> {
  const cleanSlug = slug.trim();
  console.log(`[db.ts] Attempting to fetch article with slug: "${cleanSlug}"`);
  try {
    let data = await prisma.article.findUnique({
      where: { slug: cleanSlug },
      include: {
        comments: {
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!data) {
      console.log(`[db.ts] exact findUnique failed, trying findFirst case-insensitive for "${cleanSlug}"`);
      data = await prisma.article.findFirst({
        where: { slug: { equals: cleanSlug, mode: 'insensitive' } },
        include: {
          comments: {
            orderBy: { createdAt: "desc" }
          }
        }
      });
    }

    if (!data) {
      const all = await prisma.article.findMany({ select: { slug: true } });
      const available = all.map(a => a.slug);
      console.log(`[db.ts] No article found. Available: ${available.join(', ')}`);
      // Return a special object with available slugs and DB info to help debug in the UI
      return { 
        id: "none", 
        availableSlugs: available,
        currentDb: process.env.DATABASE_URL?.split('@')[1] || 'unknown'
      } as any;
    }

    console.log(`[db.ts] Successfully found article: ${data.title}`);
    return {
      id: data.id,
      slug: data.slug,
      title: data.title,
      author: data.author,
      author_address: data.authorAddress,
      category: data.category,
      excerpt: data.excerpt,
      read_time: data.readTime,
      content: data.content,
      price: Number(data.price),
      reads: data.reads,
      created_at: data.createdAt.toISOString(),
      comments: data.comments.map(c => ({
        id: c.id,
        content: c.content,
        author: c.author,
        author_addr: c.authorAddr,
        article_slug: c.articleSlug,
        tx_hash: c.txHash,
        created_at: c.createdAt.toISOString(),
      }))
    };
  } catch (err) {
    console.error(`[db.ts] fetchArticle failed for slug ${cleanSlug}:`, err);
    return null;
  }
}

/** Save a new comment to the DB. */
export async function saveComment(data: {
  slug: string;
  author: string;
  authorAddr: string;
  content: string;
  txHash?: string;
}) {
  return await prisma.comment.create({
    data: {
      articleSlug: data.slug,
      author: data.author,
      authorAddr: data.authorAddr,
      content: data.content,
      txHash: data.txHash,
    },
  });
}

/** Fetch all articles (metadata only — no content body) */
export async function fetchAllArticles(): Promise<Omit<DbArticle, "content">[]> {
  const data = await prisma.article.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      author: true,
      authorAddress: true,
      category: true,
      excerpt: true,
      readTime: true,
      price: true,
      reads: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return data.map(item => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    author: item.author,
    author_address: item.authorAddress,
    category: item.category,
    excerpt: item.excerpt,
    read_time: item.readTime,
    price: Number(item.price),
    reads: item.reads,
    created_at: item.createdAt.toISOString()
  }));
}

/** Check if a reader has already paid for an article in the past. */
export async function hasPaidForArticle(reader: string, slug: string): Promise<boolean> {
  try {
    const count = await prisma.articleReadEvent.count({
      where: {
        reader: { equals: reader, mode: "insensitive" },
        articleSlug: slug,
        eventType: "READ"
      }
    });
    return count > 0;
  } catch (err) {
    console.error("hasPaidForArticle failed:", err);
    return false;
  }
}

/** Increment read count for an article */
export async function incrementReads(slug: string): Promise<void> {
  await prisma.article.update({
    where: { slug },
    data: {
      reads: {
        increment: 1
      }
    }
  });
}

/** Record an on-chain read event immediately upon verification */
export async function recordReadEvent(data: {
  txHash: string;
  logIndex: number;
  blockNumber: bigint;
  reader: string;
  writerAddress: string;
  articleSlug: string;
  amount: number;
}) {
  const eventId = `${data.txHash}-${data.logIndex}`;
  try {
    await prisma.articleReadEvent.upsert({
      where: { txHash: data.txHash },
      create: {
        id: eventId,
        txHash: data.txHash,
        logIndex: data.logIndex,
        blockNumber: data.blockNumber,
        reader: data.reader,
        writerAddress: data.writerAddress,
        articleSlug: data.articleSlug,
        amount: data.amount,
        eventType: "READ",
        observedAt: new Date(),
      },
      update: {}
    });
    console.log(`[db.ts] Recorded Read event for ${data.articleSlug} by ${data.reader}`);
  } catch (err) {
    console.error(`[db.ts] Failed to record Read event:`, err);
  }
}

/** Fetch recent mirrored ArticleRead events written by Goldsky Mirror. */
export async function fetchRecentArticleReadEvents(limit = 50): Promise<DbArticleReadEvent[]> {
  const data = await prisma.articleReadEvent.findMany({
    take: limit,
    orderBy: { observedAt: "desc" },
  });

  return data.map((item) => ({
    id: item.id,
    tx_hash: item.txHash,
    log_index: item.logIndex,
    block_number: item.blockNumber,
    reader: item.reader,
    writer_address: item.writerAddress,
    article_slug: item.articleSlug,
    amount: Number(item.amount),
    observed_at: item.observedAt.toISOString(),
    created_at: item.createdAt.toISOString(),
  }));
}

// ─── User helpers ─────────────────────────────────────────────────────────────

export interface DbUser {
  id: string;
  address: string;
  username: string | null;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

/** Get user profile by wallet address (case-insensitive). Returns null if not found. */
export async function fetchUserByAddress(address: string): Promise<DbUser | null> {
  const data = await prisma.user.findFirst({
    where: { address: { equals: address.toLowerCase() } },
  });
  if (!data) return null;
  return {
    id: data.id,
    address: data.address,
    username: data.username,
    displayName: data.displayName,
    bio: data.bio,
    avatarUrl: data.avatarUrl,
    createdAt: data.createdAt.toISOString(),
  };
}

/** Upsert user profile. Creates with displayName="Anonymous" if first time. */
export async function upsertUser(
  address: string,
  updates: { displayName?: string; username?: string; bio?: string; avatarUrl?: string }
): Promise<DbUser> {
  const normalized = address.toLowerCase();
  const data = await prisma.user.upsert({
    where: { address: normalized },
    create: {
      address: normalized,
      displayName: updates.displayName ?? "Anonymous",
      username: updates.username ?? null,
      bio: updates.bio ?? null,
      avatarUrl: updates.avatarUrl ?? null,
    },
    update: {
      ...(updates.displayName !== undefined && { displayName: updates.displayName }),
      ...(updates.username !== undefined && { username: updates.username }),
      ...(updates.bio !== undefined && { bio: updates.bio }),
      ...(updates.avatarUrl !== undefined && { avatarUrl: updates.avatarUrl }),
    },
  });
  return {
    id: data.id,
    address: data.address,
    username: data.username,
    displayName: data.displayName,
    bio: data.bio,
    avatarUrl: data.avatarUrl,
    createdAt: data.createdAt.toISOString(),
  };
}

/** Fetch all articles by a specific author wallet address */
export async function fetchArticlesByAuthor(authorAddress: string): Promise<Omit<DbArticle, "content">[]> {
  const data = await prisma.article.findMany({
    where: { authorAddress: { equals: authorAddress, mode: "insensitive" } },
    select: {
      id: true,
      slug: true,
      title: true,
      author: true,
      authorAddress: true,
      category: true,
      excerpt: true,
      readTime: true,
      price: true,
      reads: true,
      createdAt: true
    },
    orderBy: { createdAt: "desc" }
  });

  return data.map(item => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    author: item.author,
    author_address: item.authorAddress,
    category: item.category,
    excerpt: item.excerpt,
    read_time: item.readTime,
    price: Number(item.price),
    reads: item.reads,
    created_at: item.createdAt.toISOString()
  }));
}
