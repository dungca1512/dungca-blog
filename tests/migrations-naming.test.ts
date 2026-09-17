import fs from "node:fs/promises";
import path from "node:path";
import { describe, it, expect } from "vitest";

const MIGRATIONS_DIR = path.join(process.cwd(), "migrations");

describe("quy ước tên file migration", () => {
  /* readD1Migrations (@cloudflare/vitest-pool-workers) gom mọi *.sql trong
   * migrations/ rồi sắp theo parseInt(tên_file.split("_")[0]). Một file tên
   * không bắt đầu bằng 4 chữ số (vd. "seed-posts.sql") cho parseInt ra NaN,
   * khiến thứ tự migration không xác định — có thể seed chạy trước cả
   * CREATE TABLE, hoặc wrangler d1 migrations apply hiểu nhầm seed là một
   * migration thật. Đây chính là lý do file seed nằm ở seeds/ chứ không
   * phải migrations/. */
  it("mọi file .sql trong migrations/ khớp /^\\d{4}_/", async () => {
    const entries = await fs.readdir(MIGRATIONS_DIR, { withFileTypes: true });
    const sqlFiles = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
      .map((entry) => entry.name);

    expect(sqlFiles.length).toBeGreaterThan(0);

    for (const name of sqlFiles) {
      expect(name).toMatch(/^\d{4}_/);
    }
  });
});
