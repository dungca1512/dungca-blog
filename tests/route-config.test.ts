import { describe, it, expect } from "vitest";

/* Test này tồn tại vì một quy tắc đắt tiền: đọc D1 lúc `next build` làm rò
 * một instance workerd cho mỗi lần render trang, và chỉ vài trang là các
 * instance đó tranh khoá cùng một file SQLite cục bộ, khiến build đổ với
 * `SQLITE_BUSY (extended: SQLITE_BUSY_RECOVERY)`. Cả một vòng làm việc bị
 * BLOCKED để tìm ra nguyên nhân này (xem task-7-brief-bo-sung-2.md). Cách
 * sửa là ép các route đọc D1 thành `force-dynamic` (render theo request,
 * không đụng build) và giữ `/blog/[slug]` ở ISR (`revalidate`, không có
 * `dynamic`) vì route đó vốn không có `generateStaticParams` nên không
 * prerender lúc build.
 *
 * Nếu ai đó lỡ đổi một trong các chỉ thị dưới đây về lại tĩnh/ISR, test
 * này phải đỏ ngay — không được để quy tắc chỉ sống trong trí nhớ người. */

import * as home from "@/app/page";
import * as blogList from "@/app/blog/page";
import * as sitemapRoute from "@/app/sitemap";
import * as searchIndexRoute from "@/app/api/search-index/route";
import * as postPage from "@/app/blog/[slug]/page";

describe("route-config: quy tắc không đọc D1 lúc build", () => {
  it("/ là force-dynamic", () => {
    expect(home.dynamic).toBe("force-dynamic");
  });

  it("/blog là force-dynamic", () => {
    expect(blogList.dynamic).toBe("force-dynamic");
  });

  it("sitemap là force-dynamic", () => {
    expect(sitemapRoute.dynamic).toBe("force-dynamic");
  });

  it("/api/search-index là force-dynamic", () => {
    expect(searchIndexRoute.dynamic).toBe("force-dynamic");
  });

  it("/blog/[slug] giữ ISR (revalidate = 3600, không force-dynamic)", () => {
    expect(postPage.revalidate).toBe(3600);
    expect((postPage as { dynamic?: unknown }).dynamic).toBeUndefined();
  });

  /* `revalidate` một mình không tạo ra ISR: Next chỉ ghi route động vào
   * dynamicRoutes của prerender-manifest khi route có generateStaticParams.
   * Thiếu hàm này thì `revalidate = 3600` chỉ là một hằng số vô nghĩa và
   * revalidatePath lúc publish bài không có đường cache nào để xoá — hai
   * thứ phải đi cùng nhau nên phải được khẳng định cùng nhau. */
  it("/blog/[slug] xuất generateStaticParams trả mảng rỗng (điều kiện để revalidate có tác dụng)", async () => {
    expect(typeof postPage.generateStaticParams).toBe("function");
    expect(await postPage.generateStaticParams!()).toEqual([]);
  });
});
