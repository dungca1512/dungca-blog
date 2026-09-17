import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

const css = readFileSync("src/app/globals.css", "utf8");

/* Test này không kiểm tra "trang có đẹp không" — nó khoá hai điều máy kiểm
 * được: lớp token tồn tại, và không còn đường nào để dark mode bị bỏ quên. */
describe("lớp token --base-*", () => {
  it("khai báo đủ token ngữ nghĩa mà khu admin sẽ dùng", () => {
    const required = [
      "--base-background",
      "--base-surface",
      "--base-surface-muted",
      "--base-foreground",
      "--base-muted-foreground",
      "--base-border",
      "--base-primary",
      "--base-primary-foreground",
      "--base-accent",
      "--base-danger",
      "--base-success",
      "--base-warning",
      "--base-radius-sm",
      "--base-radius-md",
      "--base-radius-lg",
      "--base-shadow-raised",
      "--base-shadow-overlay",
    ];
    const missing = required.filter((token) => !css.includes(`${token}:`));
    expect(missing).toEqual([]);
  });

  it("token cũ được nối vào lớp base chứ không giữ giá trị riêng", () => {
    /* --accent từng là #1a8917. Nếu nó còn là một hex thì lớp cầu nối chưa
     * dựng xong và đổi palette sẽ không lan tới các component cũ. */
    expect(css).toMatch(/--accent:\s*var\(--base-/);
    expect(css).toMatch(/--bg:\s*var\(--base-/);
    expect(css).toMatch(/--surface:\s*var\(--base-/);
    expect(css).toMatch(/--text:\s*var\(--base-/);
  });

  it("không còn màu xanh lá cũ", () => {
    expect(css).not.toMatch(/#1a8917/i);
    expect(css).not.toMatch(/#156d12/i);
    expect(css).not.toMatch(/#2fc94b/i);
  });

  it("dark mode chạy bằng [data-theme] chứ không chỉ prefers-color-scheme", () => {
    /* Spec §5 yêu cầu nút chuyển theme. Nút không thể ghi đè một media query. */
    expect(css).toContain('[data-theme="dark"]');
  });
});
