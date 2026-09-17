import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const proxy = readFileSync("src/proxy.ts", "utf8");

describe("proxy bảo vệ admin", () => {
  it("matcher phủ cả /admin/* lẫn /api/admin/*", () => {
    expect(proxy).toContain("/admin/:path*");
    expect(proxy).toContain("/api/admin/:path*");
  });

  it("matcher phủ cả chính /admin, không chỉ đường con", () => {
    /* "/admin/:path*" trong Next KHÔNG khớp "/admin" trần. Thiếu dòng này thì
     * trang danh sách bài mở tự do cho cả thiên hạ. */
    expect(proxy).toMatch(/"\/admin"/);
  });

  it("không chạy trên route công khai", () => {
    expect(proxy).not.toContain("/blog/:path*");
    expect(proxy).not.toContain('"/:path*"');
  });
});

/* Test này quét cây thư mục thật, nên route admin mới thêm sau này cũng bị
 * soi — không phụ thuộc vào việc ai đó nhớ cập nhật danh sách.
 *
 * Không chỉ dựa vào Proxy: matcher là cấu hình, nên từng route ghi dữ liệu
 * vẫn phải có hàng rào requireSession của riêng nó. */
describe("mọi route /api/admin đều tự kiểm tra session", () => {
  function routeFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) return routeFiles(full);
      return entry.name === "route.ts" ? [full] : [];
    });
  }

  it("không route nào chỉ dựa vào middleware", () => {
    /* Middleware là lớp một. Nếu một ngày matcher bị sửa sai, lớp hai phải đỡ.
     * Một route ghi D1 mà không tự kiểm tra là một route chờ tai nạn. */
    const files = routeFiles("src/app/api/admin");
    expect(files.length).toBeGreaterThan(0);
    const khongKiemTra = files.filter(
      (file) => !readFileSync(file, "utf8").includes("requireSession"),
    );
    expect(khongKiemTra).toEqual([]);
  });
});
