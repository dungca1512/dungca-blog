import { describe, it, expect } from "vitest";
import { mediaObjectKey } from "@/lib/media";

const NGAY = new Date("2026-09-17T10:30:00Z");

describe("mediaObjectKey", () => {
  it("xếp theo năm/tháng", () => {
    expect(mediaObjectKey("anh.png", NGAY)).toMatch(/^2026\/09\//);
  });

  it("giữ phần mở rộng", () => {
    expect(mediaObjectKey("anh.png", NGAY)).toMatch(/\.png$/);
    expect(mediaObjectKey("So do.JPEG", NGAY)).toMatch(/\.jpeg$/);
  });

  it("bỏ dấu tiếng Việt và khoảng trắng trong tên", () => {
    /* Tên file tiếng Việt có dấu trong URL thành %E1%BA%A3nh… — dài, xấu, và
     * vài client cũ xử lý sai. */
    const key = mediaObjectKey("Ảnh màn hình.png", NGAY);
    expect(key).toMatch(/^2026\/09\/[a-z0-9-]+-[a-z0-9]+\.png$/);
  });

  it("không bao giờ trả cùng một key cho hai lần gọi", () => {
    /* Trùng key là ghi đè ảnh của bài cũ — mất dữ liệu trong im lặng. */
    const a = mediaObjectKey("anh.png", NGAY);
    const b = mediaObjectKey("anh.png", NGAY);
    expect(a).not.toBe(b);
  });

  it("chặn ../ trong tên file", () => {
    /* Tên file đến từ client. "../../secret.png" không được phép trèo ra
     * ngoài tiền tố năm/tháng. */
    const key = mediaObjectKey("../../secret.png", NGAY);
    expect(key).not.toContain("..");
    expect(key.startsWith("2026/09/")).toBe(true);
  });

  it("dự phòng khi tên file không có phần mở rộng", () => {
    expect(mediaObjectKey("khongcoduoi", NGAY)).toMatch(/\.bin$/);
  });
});
