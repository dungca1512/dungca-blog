import { describe, it, expect } from "vitest";
import { toSlug, buildArticleHtmlAndToc } from "@/lib/article-toc";

describe("toSlug", () => {
  it("bỏ dấu tiếng Việt", () => {
    expect(toSlug("Khởi tạo blog")).toBe("khoi-tao-blog");
    expect(toSlug("Học máy cơ bản")).toBe("hoc-may-co-ban");
  });

  it("xử lý được chữ đ", () => {
    // normalize("NFD") KHÔNG tách được đ/Đ — chúng là ký tự riêng, không
    // phải d kèm dấu. Chúng bị loại bỏ hoàn toàn bởi regex [^a-z0-9\s-].
    // Hành vi thật: "Đường dẫn" -> "uong-dan" (không phải "ung-dan")
    expect(toSlug("Đường dẫn")).toBe("uong-dan");
  });

  it("gộp khoảng trắng và gạch nối thừa", () => {
    expect(toSlug("A   B -- C")).toBe("a-b-c");
  });

  it("bỏ ký tự không phải chữ số", () => {
    expect(toSlug("Next.js 16: có gì mới?")).toBe("nextjs-16-co-gi-moi");
  });

  it("trả chuỗi rỗng khi không còn ký tự dùng được", () => {
    expect(toSlug("!!!")).toBe("");
  });
});

describe("buildArticleHtmlAndToc", () => {
  it("gắn id vào h2/h3 và dựng mục lục", () => {
    const { htmlWithIds, toc } = buildArticleHtmlAndToc(
      "<h2>Mở đầu</h2><p>x</p><h3>Chi tiết</h3>",
    );

    expect(toc).toEqual([
      { id: "mo-au", text: "Mở đầu", level: 2 },
      { id: "chi-tiet", text: "Chi tiết", level: 3 },
    ]);
    expect(htmlWithIds).toContain('<h2 id="mo-au" class="article-heading">');
  });

  it("không đụng tới h1 và h4", () => {
    const { toc } = buildArticleHtmlAndToc("<h1>A</h1><h4>B</h4>");
    expect(toc).toEqual([]);
  });

  it("đánh số khi hai tiêu đề trùng slug", () => {
    const { toc } = buildArticleHtmlAndToc("<h2>Ghi chú</h2><h2>Ghi chú</h2>");
    expect(toc.map((t) => t.id)).toEqual(["ghi-chu", "ghi-chu-2"]);
  });

  it("đặt id thay thế khi tiêu đề không còn ký tự dùng được", () => {
    const { toc } = buildArticleHtmlAndToc("<h2>!!!</h2>");
    expect(toc[0].id).toBe("muc-1");
  });
});
