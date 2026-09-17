import { env, applyD1Migrations } from "cloudflare:test";
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { listPublishedPosts, findPublishedPost } from "@/lib/posts";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM posts").run();
});

async function seed(
  slug: string,
  status: string,
  publishedAt: string | null,
  tags: string[] = [],
) {
  await env.DB.prepare(
    `INSERT INTO posts (slug, title, summary, tags, body_markdown, status, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      slug,
      `Tiêu đề ${slug}`,
      "Tóm tắt",
      JSON.stringify(tags),
      "## Mục\n\nNội dung.",
      status,
      publishedAt,
    )
    .run();
}

describe("listPublishedPosts", () => {
  it("bỏ qua bài nháp", async () => {
    await seed("da-dang", "published", "2026-03-01");
    await seed("con-nhap", "draft", null);

    const posts = await listPublishedPosts(env.DB);
    expect(posts.map((p) => p.slug)).toEqual(["da-dang"]);
  });

  it("sắp theo ngày đăng giảm dần", async () => {
    await seed("cu", "published", "2026-01-01");
    await seed("moi", "published", "2026-03-01");

    const posts = await listPublishedPosts(env.DB);
    expect(posts.map((p) => p.slug)).toEqual(["moi", "cu"]);
  });

  it("giải mã tags từ JSON thành mảng", async () => {
    await seed("co-tag", "published", "2026-03-01", ["ml", "next"]);

    const [post] = await listPublishedPosts(env.DB);
    expect(post.tags).toEqual(["ml", "next"]);
  });

  it("trả mảng rỗng khi chưa có bài nào", async () => {
    expect(await listPublishedPosts(env.DB)).toEqual([]);
  });

  it("không trả contentHtml — danh sách không cần render markdown", async () => {
    await seed("x", "published", "2026-03-01");
    const [post] = await listPublishedPosts(env.DB);
    expect(post).not.toHaveProperty("contentHtml");
  });
});

describe("findPublishedPost", () => {
  it("render markdown thành html", async () => {
    await seed("co-noi-dung", "published", "2026-03-01");

    const post = await findPublishedPost(env.DB, "co-noi-dung");
    expect(post?.contentHtml).toContain("<h2>Mục</h2>");
  });

  it("trả null với bài nháp", async () => {
    await seed("nhap", "draft", null);
    expect(await findPublishedPost(env.DB, "nhap")).toBeNull();
  });

  it("trả null khi không có slug", async () => {
    expect(await findPublishedPost(env.DB, "khong-co")).toBeNull();
  });

  it("chống SQL injection qua slug", async () => {
    await seed("that", "published", "2026-03-01");
    // Prepared statement nên chuỗi này là dữ liệu, không phải cú pháp.
    const post = await findPublishedPost(env.DB, "' OR '1'='1");
    expect(post).toBeNull();
  });
});
