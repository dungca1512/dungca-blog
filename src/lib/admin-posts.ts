import type { D1Database } from "@cloudflare/workers-types";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { toSlug } from "@/lib/article-toc";

/* Tách hẳn khỏi posts.ts: file kia chỉ phục vụ người đọc và chỉ được thấy bài
 * đã đăng; file này phục vụ tác giả và thấy cả nháp. Gộp hai đường lại là mở
 * cửa cho một truy vấn admin lọt ra trang công khai. */
export type AdminPostRow = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  bodyMarkdown: string;
  status: "draft" | "published";
  publishedAt: string | null;
  updatedAt: string;
};

export type PostInput = {
  title: string;
  summary: string;
  tags: string[];
  bodyMarkdown: string;
};

type Row = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  tags: string;
  body_markdown?: string;
  status: string;
  published_at: string | null;
  updated_at: string;
};

function toAdminRow(row: Row): AdminPostRow {
  let tags: string[] = [];
  try {
    const parsed: unknown = JSON.parse(row.tags);
    if (Array.isArray(parsed)) {
      tags = parsed.filter((tag): tag is string => typeof tag === "string");
    }
  } catch {
    /* Một hàng tags hỏng không đáng làm đổ cả trang quản trị. */
  }

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    tags,
    bodyMarkdown: row.body_markdown ?? "",
    status: row.status === "published" ? "published" : "draft",
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  };
}

export async function generateUniqueSlug(
  db: D1Database,
  title: string,
  excludeId?: number,
): Promise<string> {
  /* Tiêu đề toàn ký tự đặc biệt không được tạo URL rỗng. Timestamp chỉ dùng
   * làm phương án dự phòng, còn slug bình thường vẫn dễ đọc và ổn định. */
  const base = toSlug(title) || `bai-viet-${Date.now()}`;

  for (let suffix = 1; suffix < 1000; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;
    const clash = await db
      .prepare("SELECT id FROM posts WHERE slug = ? AND id IS NOT ?")
      .bind(candidate, excludeId ?? null)
      .first<{ id: number }>();

    if (!clash) return candidate;
  }

  /* Tránh một vòng lặp vô hạn trong Worker nếu dữ liệu bất thường. */
  return `${base}-${Date.now()}`;
}

export async function listAllPosts(db: D1Database): Promise<AdminPostRow[]> {
  /* Danh sách không cần tải cả Markdown, vì một bài có thể vài chục KB. */
  const { results } = await db
    .prepare(
      `SELECT id, slug, title, summary, tags, status, published_at, updated_at
       FROM posts
       ORDER BY updated_at DESC, id DESC`,
    )
    .all<Row>();

  return results.map(toAdminRow);
}

export async function findPostById(
  db: D1Database,
  id: number,
): Promise<AdminPostRow | null> {
  const row = await db
    .prepare(
      `SELECT id, slug, title, summary, tags, body_markdown, status, published_at, updated_at
       FROM posts WHERE id = ?`,
    )
    .bind(id)
    .first<Row>();

  return row ? toAdminRow(row) : null;
}

export async function createPost(
  db: D1Database,
  input: PostInput,
): Promise<AdminPostRow> {
  const slug = await generateUniqueSlug(db, input.title);
  const row = await db
    .prepare(
      `INSERT INTO posts (slug, title, summary, tags, body_markdown, status)
       VALUES (?, ?, ?, ?, ?, 'draft')
       RETURNING id, slug, title, summary, tags, body_markdown, status, published_at, updated_at`,
    )
    .bind(slug, input.title, input.summary, JSON.stringify(input.tags), input.bodyMarkdown)
    .first<Row>();

  if (!row) throw new Error("Tạo bài thất bại: INSERT không trả về hàng nào");
  return toAdminRow(row);
}

export async function updatePost(
  db: D1Database,
  id: number,
  input: PostInput,
): Promise<AdminPostRow | null> {
  const current = await findPostById(db, id);
  if (!current) return null;

  /* Slug bài đã đăng là địa chỉ công khai, nên đổi tiêu đề không được làm gãy
   * link đã chia sẻ. Nháp chưa công khai thì được phép đổi theo tiêu đề. */
  const slug =
    current.status === "published"
      ? current.slug
      : await generateUniqueSlug(db, input.title, id);

  const row = await db
    .prepare(
      `UPDATE posts
       SET slug = ?, title = ?, summary = ?, tags = ?, body_markdown = ?,
           updated_at = datetime('now')
       WHERE id = ?
       RETURNING id, slug, title, summary, tags, body_markdown, status, published_at, updated_at`,
    )
    .bind(slug, input.title, input.summary, JSON.stringify(input.tags), input.bodyMarkdown, id)
    .first<Row>();

  return row ? toAdminRow(row) : null;
}

export async function setPostStatus(
  db: D1Database,
  id: number,
  status: "draft" | "published",
): Promise<AdminPostRow | null> {
  /* published_at chỉ ghi ở lần đăng đầu: gỡ bài để sửa lỗi rồi đăng lại không
   * được đẩy nó lên đầu trang như một bài mới. */
  const row = await db
    .prepare(
      `UPDATE posts
       SET status = ?,
           published_at = CASE WHEN ? = 'published'
                               THEN COALESCE(published_at, datetime('now'))
                               ELSE published_at END,
           updated_at = datetime('now')
       WHERE id = ?
       RETURNING id, slug, title, summary, tags, body_markdown, status, published_at, updated_at`,
    )
    .bind(status, status, id)
    .first<Row>();

  return row ? toAdminRow(row) : null;
}

export async function deletePost(db: D1Database, id: number): Promise<boolean> {
  const result = await db.prepare("DELETE FROM posts WHERE id = ?").bind(id).run();
  return (result.meta.changes ?? 0) > 0;
}

/* Không route nào gọi hàm này lúc next build: admin là runtime-only. */
export async function adminDb(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}
