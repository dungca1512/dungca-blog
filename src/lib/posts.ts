import type { D1Database } from "@cloudflare/workers-types";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { markdownToHtml } from "@/lib/markdown";

/* Hình dạng này khớp PostListItem cũ trong content.ts, cố ý: top-search.tsx
 * và blog-feed.tsx đọc các trường này và không cần biết nguồn đã đổi. */
export type PostListItem = {
  slug: string;
  title: string;
  summary: string;
  date: string;
  tags: string[];
};

export type Post = PostListItem & {
  contentHtml: string;
};

type PostRow = {
  slug: string;
  title: string;
  summary: string;
  tags: string;
  published_at: string | null;
  body_markdown?: string;
};

function parseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((tag): tag is string => typeof tag === "string");
  } catch {
    // Một hàng có tags hỏng không đáng làm đổ cả trang blog.
    return [];
  }
}

function toListItem(row: PostRow): PostListItem {
  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    date: row.published_at ?? "",
    tags: parseTags(row.tags),
  };
}

/* Hàm lõi nhận db làm tham số để test truyền env.DB vào được. Hàm bọc ở
 * cuối file mới đi lấy binding. */
export async function listPublishedPosts(db: D1Database): Promise<PostListItem[]> {
  const { results } = await db
    .prepare(
      `SELECT slug, title, summary, tags, published_at
       FROM posts
       WHERE status = 'published'
       ORDER BY published_at DESC`,
    )
    .all<PostRow>();

  return results.map(toListItem);
}

export async function findPublishedPost(
  db: D1Database,
  slug: string,
): Promise<Post | null> {
  const row = await db
    .prepare(
      `SELECT slug, title, summary, tags, published_at, body_markdown
       FROM posts
       WHERE slug = ? AND status = 'published'`,
    )
    .bind(slug)
    .first<PostRow>();

  if (!row) {
    return null;
  }

  return {
    ...toListItem(row),
    contentHtml: await markdownToHtml(row.body_markdown ?? ""),
  };
}

function db(): D1Database {
  return getCloudflareContext().env.DB as unknown as D1Database;
}

export async function getAllPosts(): Promise<PostListItem[]> {
  return listPublishedPosts(db());
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  return findPublishedPost(db(), slug);
}
