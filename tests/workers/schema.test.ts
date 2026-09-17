import { env, applyD1Migrations } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

describe("schema posts", () => {
  it("chèn được bài và đọc lại", async () => {
    await env.DB.prepare(
      "INSERT INTO posts (slug, title, body_markdown) VALUES (?, ?, ?)",
    )
      .bind("bai-thu", "Bài thử", "# xin chào")
      .run();

    const row = await env.DB.prepare("SELECT * FROM posts WHERE slug = ?")
      .bind("bai-thu")
      .first<{ status: string; tags: string; created_at: string }>();

    expect(row?.status).toBe("draft");
    expect(row?.tags).toBe("[]");
    expect(row?.created_at).toBeTruthy();
  });

  it("từ chối slug trùng", async () => {
    await env.DB.prepare("INSERT INTO posts (slug, title) VALUES (?, ?)")
      .bind("trung", "A")
      .run();

    await expect(
      env.DB.prepare("INSERT INTO posts (slug, title) VALUES (?, ?)")
        .bind("trung", "B")
        .run(),
    ).rejects.toThrow();
  });

  it("từ chối status ngoài draft/published", async () => {
    await expect(
      env.DB.prepare("INSERT INTO posts (slug, title, status) VALUES (?, ?, ?)")
        .bind("sai-status", "C", "deleted")
        .run(),
    ).rejects.toThrow();
  });
});
