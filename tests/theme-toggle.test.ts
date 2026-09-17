import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

const layout = readFileSync("src/app/layout.tsx", "utf8");
const toggle = readFileSync("src/components/theme-toggle.tsx", "utf8");

describe("chuyển theme", () => {
  it("layout đặt theme TRƯỚC khi trang vẽ", () => {
    /* Nếu đặt data-theme trong useEffect, trang vẽ nền sáng rồi mới nhảy sang
     * tối — cái chớp trắng vào mặt người đọc ban đêm. Phải là script chặn
     * trong <head>. */
    expect(layout).toContain("dangerouslySetInnerHTML");
    expect(layout).toMatch(/suppressHydrationWarning/);
  });

  it("nút đọc và ghi cùng một khoá localStorage với script chống nháy", () => {
    expect(layout).toContain('"theme"');
    expect(toggle).toContain('"theme"');
  });

  it("nút là client component", () => {
    expect(toggle).toMatch(/^"use client"/);
  });

  it("nút có nhãn cho trình đọc màn hình", () => {
    expect(toggle).toContain("aria-label");
  });

  it("nút KHÔNG dùng suppressHydrationWarning", () => {
    /* Đã đo bằng trình duyệt: cờ này khiến React giữ nguyên HTML server, nên
     * ở chế độ tối icon và aria-label kẹt ngược vĩnh viễn. Giữ test này để
     * không ai vô tình đặt lại. */
    expect(toggle).not.toContain("suppressHydrationWarning");
  });

  it("nút lấy theme qua useSyncExternalStore", () => {
    /* useState + khởi tạo lười sẽ lệch giữa server và client. Hook này có
     * getServerSnapshot riêng nên hydrate khớp rồi tự render lại đúng. */
    expect(toggle).toContain("useSyncExternalStore");
  });
});
