/* Chuyển content/posts/*.md vào D1. Chạy ở Node local vì Worker không có
   filesystem lúc chạy.

   Upsert theo slug: lần chạy đầu thường sai gì đó và phải chạy lại, nên
   script phải chạy lại được mà không nhân bản dữ liệu. */
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

function asString(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function asTags(value) {
  if (Array.isArray(value)) {
    return value.filter((t) => typeof t === "string").map((t) => t.trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map((t) => t.trim()).filter(Boolean);
  }
  return [];
}

function normalizeDate(value) {
  const raw = asString(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toISOString().slice(0, 10);
}

export async function buildPostRows(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && e.name.endsWith(".md") && !e.name.startsWith("_"))
    .map((e) => e.name);

  const rows = [];
  for (const file of files) {
    const source = await fs.readFile(path.join(dir, file), "utf8");
    const parsed = matter(source);
    const data = parsed.data;

    rows.push({
      slug: file.replace(/\.md$/i, ""),
      title: asString(data.title, file),
      summary: asString(data.summary, ""),
      tags: JSON.stringify(asTags(data.tags)),
      body_markdown: parsed.content,
      // Mọi bài đang nằm trong repo đều đã công khai trên site hôm nay.
      status: "published",
      published_at: normalizeDate(data.date),
    });
  }

  return rows.sort((a, b) => a.slug.localeCompare(b.slug));
}

function quote(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function toSqlStatements(rows) {
  return rows.map(
    (row) =>
      `INSERT INTO posts (slug, title, summary, tags, body_markdown, status, published_at)
VALUES (${quote(row.slug)}, ${quote(row.title)}, ${quote(row.summary)}, ${quote(row.tags)}, ${quote(row.body_markdown)}, ${quote(row.status)}, ${quote(row.published_at)})
ON CONFLICT(slug) DO UPDATE SET
  title = excluded.title,
  summary = excluded.summary,
  tags = excluded.tags,
  body_markdown = excluded.body_markdown,
  updated_at = datetime('now');`,
  );
  /* published_at cố ý KHÔNG nằm trong DO UPDATE: chạy lại script không được
     đổi ngày đăng của bài đã có trên site. */
}

// Chỉ ghi file SQL khi được gọi trực tiếp; khi import từ test thì không.
if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = await buildPostRows("content/posts");
  const sql = toSqlStatements(rows).join("\n\n");
  // File seed nằm ở seeds/, KHÔNG phải migrations/: vitest.workers.config.mts
  // quét mọi *.sql trong migrations/ để nạp vào test qua readD1Migrations,
  // và sắp thứ tự bằng parseInt(tên_file) — với "seed-posts.sql" ra NaN nên
  // thứ tự chạy không xác định, có thể seed chạy trước cả CREATE TABLE.
  // wrangler d1 migrations apply cũng sẽ hiểu nhầm đây là một migration.
  await fs.writeFile("seeds/posts.sql", sql, "utf8");
  console.log(`Đã sinh seeds/posts.sql cho ${rows.length} bài.`);
  console.log("Nạp bằng:");
  console.log("  npx wrangler d1 execute dungca-blog --local --file seeds/posts.sql");
  console.log("  npx wrangler d1 execute dungca-blog --remote --file seeds/posts.sql");
}
