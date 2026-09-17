/* SINH TỰ ĐỘNG bởi scripts/build-projects-index.mjs — đừng sửa tay.
 * Chạy lại: node scripts/build-projects-index.mjs
 *
 * Sitemap render ở Worker, nơi không có filesystem, nên không đọc được
 * content/projects/. Danh sách này được nướng vào bundle lúc build. */
export type ProjectIndexEntry = {
  slug: string;
  date: string;
};

export const PROJECT_INDEX: ProjectIndexEntry[] = [
  { slug: "2026-03-03-demo-ai-local", date: "2026-03-03" },
];
