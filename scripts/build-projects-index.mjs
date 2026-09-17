/* Nướng danh sách slug/date của content/projects/*.md vào bundle lúc build.

   Sitemap render ở Worker (force-dynamic), nơi không có filesystem, nên
   không thể gọi thẳng src/lib/projects.ts lúc chạy. Script này chạy ở Node
   lúc build/dev, đọc content/projects/ và ghi ra
   src/lib/projects-index.generated.ts — một module thuần dữ liệu, không đụng
   node:fs, sitemap import được an toàn.

   Chạy lại mỗi khi thêm/bớt/đổi ngày một project:
     node scripts/build-projects-index.mjs */
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const PROJECTS_DIR = path.join(process.cwd(), "content", "projects");
const OUTPUT_FILE = path.join(
  process.cwd(),
  "src",
  "lib",
  "projects-index.generated.ts",
);

function asString(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeDate(value) {
  const raw = asString(value);
  if (!raw) return "";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toISOString().slice(0, 10);
}

async function buildIndex() {
  const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith("_"));

  const items = [];
  for (const file of files) {
    const source = await fs.readFile(path.join(PROJECTS_DIR, file), "utf8");
    const parsed = matter(source);
    items.push({
      slug: file.replace(/\.md$/i, ""),
      date: normalizeDate(parsed.data.date),
    });
  }

  return items.sort((a, b) => a.slug.localeCompare(b.slug));
}

function renderModule(items) {
  const entries = items
    .map((item) => `  { slug: ${JSON.stringify(item.slug)}, date: ${JSON.stringify(item.date)} },`)
    .join("\n");

  return `/* SINH TỰ ĐỘNG bởi scripts/build-projects-index.mjs — đừng sửa tay.
 * Chạy lại: node scripts/build-projects-index.mjs
 *
 * Sitemap render ở Worker, nơi không có filesystem, nên không đọc được
 * content/projects/. Danh sách này được nướng vào bundle lúc build. */
export type ProjectIndexEntry = {
  slug: string;
  date: string;
};

export const PROJECT_INDEX: ProjectIndexEntry[] = [
${entries}
];
`;
}

const items = await buildIndex();
await fs.writeFile(OUTPUT_FILE, renderModule(items), "utf8");
console.log(`Đã sinh ${OUTPUT_FILE.replace(process.cwd() + path.sep, "")} cho ${items.length} project.`);
