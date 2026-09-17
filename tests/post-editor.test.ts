import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const editor = readFileSync("src/components/admin/post-editor.tsx", "utf8");

describe("yêu cầu dùng trên điện thoại", () => {
  it("xem trước là TAB chứ không chia đôi màn hình", () => {
    expect(editor).toContain('role="tablist"');
    expect(editor).toMatch(/tab === "soan" \? \(/);
  });
  it("tự lưu nháp vào localStorage", () => {
    expect(editor).toContain("localStorage");
    expect(editor).toContain("setItem");
  });
  it("nút lưu nháp tách khỏi nút đăng", () => {
    expect(editor).toContain("Lưu nháp");
    expect(editor).toContain("Đăng bài");
  });
  it("xem trước dùng chính lib markdown", () => {
    expect(editor).toContain("@/lib/markdown");
  });
  it("là client component", () => expect(editor).toMatch(/^"use client"/));
});
