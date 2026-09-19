import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

const layout = readFileSync("src/app/layout.tsx", "utf8");
const toggle = readFileSync("src/components/theme-toggle.tsx", "utf8");
const themeLib = readFileSync("src/lib/theme.ts", "utf8");

describe("chuyển theme", () => {
  it("layout đặt theme TRƯỚC khi trang vẽ", () => {
    /* Nếu đặt data-theme trong useEffect, trang vẽ nền sáng rồi mới nhảy sang
     * tối — cái chớp trắng vào mặt người đọc ban đêm. Phải là script chặn
     * trong <head>. */
    expect(layout).toContain("dangerouslySetInnerHTML");
    expect(layout).toMatch(/suppressHydrationWarning/);
  });

  it("nút và script chống nháy dùng chung một khoá localStorage", () => {
    /* Khoá được khai đúng một lần trong lib; nút đi qua hằng số đó, còn script
     * trong layout là chuỗi thô nên phải khớp bằng mắt — test này chính là
     * con mắt đó. */
    expect(themeLib).toContain('THEME_STORAGE_KEY = "theme"');
    expect(toggle).toContain("THEME_STORAGE_KEY");
    expect(layout).toContain('localStorage.getItem("theme")');
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

  it("nút và lib dùng chung một định nghĩa chế độ", () => {
    /* Hai bản sao của luật "giá trị nào là hợp lệ" sẽ lệch nhau, và lệch ở
     * đây nghĩa là nút hiện một đằng còn trang vẽ một nẻo. */
    expect(toggle).toContain('@/lib/theme');
    expect(toggle).toContain("cheDoKeTiep");
  });

  it("chế độ theo hệ thống GỠ data-theme thay vì đặt một giá trị", () => {
    /* Còn data-theme trên <html> là @media (prefers-color-scheme) bị vô hiệu,
     * và người dùng bật chế độ tối của máy giữa phiên sẽ thấy trang kẹt sáng. */
    expect(toggle).toContain("removeAttribute");
  });

  it("script chống nháy cũng biết ba chế độ", () => {
    /* Script này chạy trước React. Nó mà chỉ hiểu hai giá trị thì trang nháy
     * sai màu ở mọi lần tải của người đang để chế độ hệ thống. */
    expect(layout).toContain("removeAttribute");
    expect(layout).toMatch(/"dark"[^\n]*"light"|"light"[^\n]*"dark"/);
  });

  it("nút lấy theme qua useSyncExternalStore", () => {
    /* useState + khởi tạo lười sẽ lệch giữa server và client. Hook này có
     * getServerSnapshot riêng nên hydrate khớp rồi tự render lại đúng. */
    expect(toggle).toContain("useSyncExternalStore");
  });
});
