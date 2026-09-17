import { describe, it, expect } from "vitest";
import { markdownToHtml } from "@/lib/markdown";

describe("markdownToHtml", () => {
  it("dựng tiêu đề", async () => {
    expect(await markdownToHtml("## Mở đầu")).toContain("<h2>Mở đầu</h2>");
  });

  it("dựng bảng GFM", async () => {
    const html = await markdownToHtml("| a | b |\n| - | - |\n| 1 | 2 |");
    expect(html).toContain("<table>");
  });

  it("giữ nguyên khối code kèm tên ngôn ngữ", async () => {
    const html = await markdownToHtml("```ts\nconst x = 1;\n```");
    expect(html).toContain("<code");
    expect(html).toContain("const x = 1;");
  });

  it("lọc bỏ thẻ script (ranh giới tin cậy cho nội dung từ D1)", async () => {
    const html = await markdownToHtml("<script>alert(1)</script>");
    expect(html).not.toContain("<script");
  });
});
