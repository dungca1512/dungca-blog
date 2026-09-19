import { describe, it, expect, vi, beforeEach } from "vitest";

/* Chỉ giả lập đúng một biên: đọc D1. Phần được kiểm là header thật do route
 * sinh ra, không phải hành vi của mock.
 *
 * Vì sao route này cần Cache-Control: TopSearch nạp /api/search-index mỗi
 * lần người dùng chạm vào ô tìm kiếm, ở mọi trang. Không có header thì Next
 * gắn `no-store` cho route force-dynamic, nên mỗi lượt chạm là một truy vấn
 * D1 mới — kể cả khi người dùng vừa nạp chỉ mục đó xong ở trang trước. */
vi.mock("@/lib/posts", () => ({
  getAllPosts: vi.fn(async () => [
    { slug: "bai-mot", title: "Bài một", summary: "", tags: [], publishedAt: null },
  ]),
}));

import * as searchIndexRoute from "@/app/api/search-index/route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/api/search-index", () => {
  it("trả Cache-Control cho phép cache chung, có cửa sổ phục vụ đồ cũ", async () => {
    const res = await searchIndexRoute.GET();

    expect(res.headers.get("Cache-Control")).toBe(
      "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
    );
  });

  it("vẫn trả JSON danh sách bài", async () => {
    const res = await searchIndexRoute.GET();

    expect(res.headers.get("Content-Type")).toContain("application/json");
    expect(await res.json()).toEqual([
      { slug: "bai-mot", title: "Bài một", summary: "", tags: [], publishedAt: null },
    ]);
  });
});
