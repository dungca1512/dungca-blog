import { describe, it, expect } from "vitest";

import { locTheoTienTo, slugThieuTrongSitemap } from "../scripts/smoke-checks.mjs";

/* Bản cũ của smoke chỉ hỏi "sitemap có URL nào KHÔNG GIỐNG /blog/<gì đó>/
 * không". Câu hỏi đó vẫn xanh khi sitemap còn đúng một bài cũ trong lúc D1
 * đã có mười bài mới — tức là đúng cái lỗi sitemap-lệch-nguồn mà nó phải
 * bắt. Hai hàm dưới đây cho phép đối chiếu với slug thật. */

const LOCS = [
  "https://blog.example/",
  "https://blog.example/blog/bai-mot/",
  "https://blog.example/blog/bai-hai/",
  "https://blog.example/projects/demo/",
];

describe("slugThieuTrongSitemap", () => {
  it("trả rỗng khi sitemap có đủ mọi slug đã đăng", () => {
    expect(slugThieuTrongSitemap(LOCS, ["bai-mot", "bai-hai"])).toEqual([]);
  });

  it("gọi tên đúng slug bị thiếu", () => {
    expect(slugThieuTrongSitemap(LOCS, ["bai-mot", "bai-ba"])).toEqual(["bai-ba"]);
  });

  it("không bị lừa bởi slug trùng một phần", () => {
    /* "bai" không được coi là có mặt chỉ vì tồn tại "bai-mot". */
    expect(slugThieuTrongSitemap(LOCS, ["bai"])).toEqual(["bai"]);
  });

  it("chấp nhận URL không có gạch chéo cuối", () => {
    expect(slugThieuTrongSitemap(["https://blog.example/blog/bai-mot"], ["bai-mot"])).toEqual(
      [],
    );
  });

  it("slug có dấu tiếng Việt đã mã hoá phần trăm vẫn khớp", () => {
    /* toSlug bỏ dấu, nhưng sitemap vẫn có thể mã hoá URL — đừng để một
     * phép so sánh chuỗi thô biến chuyện đó thành báo động giả. */
    expect(slugThieuTrongSitemap(["https://blog.example/blog/%C4%91ay-la-bai/"], ["đay-la-bai"])).toEqual(
      [],
    );
  });
});

describe("locTheoTienTo", () => {
  it("lọc đúng nhánh và bỏ trang gốc", () => {
    expect(locTheoTienTo(LOCS, "/blog/")).toEqual([
      "https://blog.example/blog/bai-mot/",
      "https://blog.example/blog/bai-hai/",
    ]);
    expect(locTheoTienTo(LOCS, "/projects/")).toEqual(["https://blog.example/projects/demo/"]);
  });

  it("trả rỗng khi không có URL nào thuộc nhánh", () => {
    expect(locTheoTienTo(["https://blog.example/"], "/blog/")).toEqual([]);
  });
});
