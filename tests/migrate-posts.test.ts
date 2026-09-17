import { describe, it, expect } from "vitest";
import { buildPostRows, toSqlStatements } from "../scripts/migrate-posts.mjs";

describe("buildPostRows", () => {
  it("đọc đủ 6 bài thật, bỏ qua _template", async () => {
    const rows = await buildPostRows("content/posts");
    expect(rows).toHaveLength(6);
    expect(rows.map((r) => r.slug)).not.toContain("_template");
  });

  it("lấy slug từ tên file", async () => {
    const rows = await buildPostRows("content/posts");
    expect(rows.map((r) => r.slug)).toContain("2026-03-03-khoi-tao-blog");
  });

  it("đặt mọi bài migrate sang là published", async () => {
    const rows = await buildPostRows("content/posts");
    expect(rows.every((r) => r.status === "published")).toBe(true);
  });

  it("chuyển tags thành chuỗi JSON", async () => {
    const rows = await buildPostRows("content/posts");
    for (const row of rows) {
      expect(() => JSON.parse(row.tags)).not.toThrow();
      expect(Array.isArray(JSON.parse(row.tags))).toBe(true);
    }
  });

  it("giữ nguyên thân markdown, không render sang html", async () => {
    const rows = await buildPostRows("content/posts");
    expect(rows.every((r) => !r.body_markdown.includes("<p>"))).toBe(true);
  });
});

describe("toSqlStatements", () => {
  const row = {
    slug: "a",
    title: "Tiêu đề",
    summary: "Tóm tắt",
    tags: '["x"]',
    body_markdown: "## H",
    status: "published",
    published_at: "2026-03-01",
  };

  it("sinh upsert chứ không phải insert trần", () => {
    const [sql] = toSqlStatements([row]);
    expect(sql).toContain("ON CONFLICT(slug) DO UPDATE");
  });

  it("thoát dấu nháy đơn trong nội dung", () => {
    const [sql] = toSqlStatements([{ ...row, title: "Nó 'đây'" }]);
    expect(sql).toContain("Nó ''đây''");
  });

  it("giữ nguyên published_at cũ khi chạy lại", () => {
    // Chạy lại script không được đổi ngày đăng của bài đã có.
    const [sql] = toSqlStatements([row]);
    expect(sql).not.toMatch(/DO UPDATE SET[\s\S]*published_at\s*=\s*excluded/);
  });
});
