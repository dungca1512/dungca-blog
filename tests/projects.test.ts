import { describe, it, expect } from "vitest";
import {
  getAllProjects,
  getProjectBySlug,
  getProjectSlugs,
  getFeaturedReposConfig,
} from "@/lib/projects";

describe("getProjectSlugs", () => {
  it("bỏ qua file bắt đầu bằng gạch dưới", async () => {
    const slugs = await getProjectSlugs();
    expect(slugs).toContain("2026-03-03-demo-ai-local");
    expect(slugs).not.toContain("_template");
  });
});

describe("getAllProjects", () => {
  /* content/projects/ hiện chỉ có ĐÚNG MỘT project, nên không viết được test
   * sắp xếp từ dữ liệu thật: mọi assertion về thứ tự trên mảng một phần tử
   * đều xanh kể cả khi hàm sort hỏng. Thay vào đó kiểm việc đọc và parse
   * frontmatter, là thứ thật sự có thể sai. */
  it("đọc đủ các trường frontmatter", async () => {
    const projects = await getAllProjects();
    const project = projects.find((p) => p.slug === "2026-03-03-demo-ai-local");

    expect(project).toMatchObject({
      title: "Demo AI local",
      date: "2026-03-03",
      order: 1,
    });
    expect(project?.tags).toContain("ai");
  });

  it("không trả về contentHtml trong danh sách", async () => {
    const projects = await getAllProjects();
    expect(projects[0]).not.toHaveProperty("contentHtml");
  });
});

describe("getProjectBySlug", () => {
  it("trả contentHtml đã render", async () => {
    const project = await getProjectBySlug("2026-03-03-demo-ai-local");
    expect(project).not.toBeNull();
    expect(project?.contentHtml).toContain("<");
  });

  it("trả null khi không có slug", async () => {
    expect(await getProjectBySlug("khong-ton-tai")).toBeNull();
  });
});

describe("getFeaturedReposConfig", () => {
  it("đọc được githubUser", async () => {
    const config = await getFeaturedReposConfig();
    expect(config.githubUser).toBe("dungca1512");
  });
});
