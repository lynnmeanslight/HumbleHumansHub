import fs from "fs";
import path from "path";
import matter from "gray-matter";

const ARTICLES_DIR = path.join(process.cwd(), "../content/articles");

export interface ArticleMeta {
  slug: string;
  title: string;
  author: string;
  authorAddress: string;
  readTime: string;
  date: string;
  category: string;
  excerpt: string;
  price: number;
}

export interface Article extends ArticleMeta {
  content: string; // raw MDX/markdown body
}

/** Read all article slugs from the content directory */
export function getArticleSlugs(): string[] {
  if (!fs.existsSync(ARTICLES_DIR)) return [];
  return fs
    .readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"))
    .map((f) => f.replace(/\.mdx?$/, ""));
}

/** Read a single article by slug — returns null if not found */
export function getArticle(slug: string): Article | null {
  const mdxPath = path.join(ARTICLES_DIR, `${slug}.mdx`);
  const mdPath = path.join(ARTICLES_DIR, `${slug}.md`);
  const filePath = fs.existsSync(mdxPath) ? mdxPath : fs.existsSync(mdPath) ? mdPath : null;

  if (!filePath) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  return {
    slug,
    title: data.title ?? slug,
    author: data.author ?? "Unknown",
    authorAddress: data.authorAddress ?? "0x0000000000000000000000000000000000000000",
    readTime: data.readTime ?? "5 min",
    date: data.date ?? "",
    category: data.category ?? "General",
    excerpt: data.excerpt ?? "",
    price: data.price ?? 0.001,
    content,
  };
}

/** Read all articles (metadata only, no content body) */
export function getAllArticles(): ArticleMeta[] {
  return getArticleSlugs()
    .map((slug) => {
      const article = getArticle(slug);
      if (!article) return null;
      const { content: _, ...meta } = article;
      return meta;
    })
    .filter(Boolean) as ArticleMeta[];
}
