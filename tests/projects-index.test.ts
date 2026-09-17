import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { describe, it, expect } from "vitest";

import { PROJECT_INDEX } from "@/lib/projects-index.generated";

const PROJECTS_DIR = path.join(process.cwd(), "content", "projects");

/* Nếu ai đó thêm/xoá/đổi ngày một project mà quên chạy lại
 * scripts/build-projects-index.mjs, sitemap sẽ lặng lẽ thiếu URL — đúng lỗi
 * đã xảy ra thực tế. Test này đọc content/projects/ trực tiếp (project
 * `node`, có filesystem) và so với bundle đã nướng sẵn, để chênh lệch bị bắt
 * ở CI thay vì bị phát hiện trên production. */
async function readActualProjects() {
  const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith("_"));

  const items = [];
  for (const file of files) {
    const source = await fs.readFile(path.join(PROJECTS_DIR, file), "utf8");
    const parsed = matter(source);
    const rawDate = typeof parsed.data.date === "string" ? parsed.data.date.trim() : "";
    const date = rawDate
      ? new Date(rawDate).toISOString().slice(0, 10)
      : "";

    items.push({ slug: file.replace(/\.md$/i, ""), date });
  }

  return items.sort((a, b) => a.slug.localeCompare(b.slug));
}

describe("projects-index.generated", () => {
  it("khớp số lượng project thật trong content/projects/", async () => {
    const actual = await readActualProjects();
    expect(PROJECT_INDEX).toHaveLength(actual.length);
  });

  it("khớp tập slug với content/projects/", async () => {
    const actual = await readActualProjects();
    const actualSlugs = actual.map((item) => item.slug).sort();
    const indexSlugs = PROJECT_INDEX.map((item) => item.slug).sort();
    expect(indexSlugs).toEqual(actualSlugs);
  });

  it("khớp date với frontmatter cho từng slug", async () => {
    const actual = await readActualProjects();
    const actualBySlug = new Map(actual.map((item) => [item.slug, item.date]));

    for (const entry of PROJECT_INDEX) {
      expect(entry.date).toBe(actualBySlug.get(entry.slug));
    }
  });
});
