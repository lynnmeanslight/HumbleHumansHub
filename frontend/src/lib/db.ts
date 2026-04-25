import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ─── Types ────────────────────────────────────────────────────────────────────

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
export async function fetchArticle(slug: string): Promise<DbArticle | null> {
  const data = await prisma.article.findUnique({
    where: { slug }
  });

  if (!data) return null;
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
    created_at: data.createdAt.toISOString()
  };
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
