import { describe, it, expect } from "vitest";

import { getAllProjects } from "@/lib/projects";
import { PROJECT_INDEX } from "@/lib/projects-index.generated";

/* Sitemap render trong Worker, nơi không có filesystem, nên nó đọc
 * PROJECT_INDEX đã nướng sẵn thay vì gọi getAllProjects(). Cái giá của việc
 * đó: một bản sao có thể lệch khỏi bản gốc mà không ai biết — sitemap lặng
 * lẽ thiếu URL, đúng lỗi đã xảy ra thật.
 *
 * Test này so bản sao với CHÍNH getAllProjects() chứ không dựng lại luật đọc
 * file. Quan trọng: nếu chép lại luật lọc của script vào đây thì test chỉ
 * khẳng định script bằng chính nó, và mọi lệch về ngữ nghĩa — ví dụ quên lọc
 * `published: false` — sẽ lọt. Gọi thẳng bản gốc thì không lọt được.
 *
 * Test chạy ở project `node` nên getAllProjects() còn filesystem để đọc. */
describe("projects-index.generated", () => {
  it("khớp tập slug với getAllProjects()", async () => {
    const actual = await getAllProjects();

    expect(PROJECT_INDEX.map((item) => item.slug).sort()).toEqual(
      actual.map((project) => project.slug).sort(),
    );
  });

  it("khớp date với getAllProjects() cho từng slug", async () => {
    const actual = await getAllProjects();
    const dateBySlug = new Map(actual.map((p) => [p.slug, p.date]));

    for (const entry of PROJECT_INDEX) {
      expect(entry.date).toBe(dateBySlug.get(entry.slug));
    }
  });

  it("không liệt kê project published: false", async () => {
    /* getAllProjects() đã lọc sẵn, nên phép so tập slug ở trên tự bắt được.
     * Khẳng định lại ở đây để lý do tồn tại của luật lọc nằm trong tên test:
     * một project chưa đăng mà lọt vào sitemap là URL dẫn tới 404. */
    const actual = await getAllProjects();
    const published = new Set(actual.map((p) => p.slug));

    for (const entry of PROJECT_INDEX) {
      expect(published.has(entry.slug)).toBe(true);
    }
  });
});
