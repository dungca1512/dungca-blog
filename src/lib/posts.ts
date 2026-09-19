import { cache } from "react";

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

export type PostPageData = {
  post: Post | null;
  allPosts: PostListItem[];
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

/* async: true là lưới an toàn cho đường gọi nằm ngoài request context (ví
 * dụ script chạy tay). Mọi đường gọi hiện tại (/, /blog, /blog/[slug],
 * /api/search-index) đều nằm trong request nên bản đồng bộ của
 * getCloudflareContext() cũng đủ dùng.
 *
 * Điều quan trọng nhất: KHÔNG đường gọi nào được phép chạy lúc `next
 * build`. Home và /blog từng gọi getAllPosts() lúc prerender — mỗi lần
 * render như vậy rò một instance workerd, chỉ vài trang là tranh khoá file
 * SQLite cục bộ và build đổ với SQLITE_BUSY. Vì vậy home, /blog và sitemap
 * giờ force-dynamic, còn layout không còn gọi getAllPosts() nữa (chỉ mục
 * tìm kiếm chuyển sang route /api/search-index, nạp lúc runtime). Xem
 * tests/route-config.test.ts — test đó khoá đúng quy tắc này. */
async function db(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

export async function getAllPosts(): Promise<PostListItem[]> {
  return listPublishedPosts(await db());
}

/* Trang bài viết cần hai thứ: chính bài đó, và danh sách bài đã đăng (để
 * dựng "bài mới nhất" và "bài liên quan"). Gộp vào một db.batch() để cả hai
 * đi trong MỘT vòng tới D1 thay vì hai. */
export async function fetchPostPageData(
  db: D1Database,
  slug: string,
): Promise<PostPageData> {
  const [chiTiet, danhSach] = await db.batch<PostRow>([
    db
      .prepare(
        `SELECT slug, title, summary, tags, published_at, body_markdown
         FROM posts
         WHERE slug = ? AND status = 'published'`,
      )
      .bind(slug),
    db.prepare(
      `SELECT slug, title, summary, tags, published_at
       FROM posts
       WHERE status = 'published'
       ORDER BY published_at DESC`,
    ),
  ]);

  const row = chiTiet.results[0];

  return {
    post: row
      ? { ...toListItem(row), contentHtml: await markdownToHtml(row.body_markdown ?? "") }
      : null,
    allPosts: danhSach.results.map(toListItem),
  };
}

/* cache() của React gộp các lượt gọi trùng tham số TRONG CÙNG một lần
 * render. generateMetadata và thân trang đều cần cùng dữ liệu này; thiếu
 * cache() thì mỗi lần render bài là 3 truy vấn (metadata 1, trang 2). Có
 * cache() và batch ở trên: còn đúng một vòng. Xem
 * node_modules/next/dist/docs/01-app/01-getting-started/14-metadata-and-og-images.md
 * mục "Memoizing data requests". */
export const getPostPageData = cache(
  async (slug: string): Promise<PostPageData> => fetchPostPageData(await db(), slug),
);
