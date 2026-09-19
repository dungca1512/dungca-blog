import { describe, expect, it } from "vitest";

import { cheDoKeTiep, docCheDo, nhanCheDo, thuocTinhTheme } from "@/lib/theme";

describe("docCheDo", () => {
  it("không có gì trong localStorage là THEO HỆ THỐNG", () => {
    expect(docCheDo(null)).toBe("system");
  });

  it("giữ nguyên lựa chọn cũ đã lưu trước khi có chế độ hệ thống", () => {
    /* Bản trước chỉ ghi "light"/"dark". Người đã chọn tối không được tỉnh dậy
     * thấy giao diện sáng chỉ vì ta thêm một chế độ mới. */
    expect(docCheDo("dark")).toBe("dark");
    expect(docCheDo("light")).toBe("light");
  });

  it("giá trị rác coi như theo hệ thống, không làm hỏng trang", () => {
    expect(docCheDo("")).toBe("system");
    expect(docCheDo("Dark")).toBe("system");
    expect(docCheDo("auto")).toBe("system");
  });
});

describe("cheDoKeTiep", () => {
  it("đi một vòng: hệ thống → sáng → tối → hệ thống", () => {
    expect(cheDoKeTiep("system")).toBe("light");
    expect(cheDoKeTiep("light")).toBe("dark");
    expect(cheDoKeTiep("dark")).toBe("system");
  });

  it("bấm ba lần quay về đúng chỗ cũ", () => {
    /* Không có vòng nào cụt: mọi chế độ đều tới lại được bằng cách bấm tiếp,
     * kể cả khi người dùng không biết mình đang ở đâu. */
    for (const dau of ["system", "light", "dark"] as const) {
      expect(cheDoKeTiep(cheDoKeTiep(cheDoKeTiep(dau)))).toBe(dau);
    }
  });
});

describe("thuocTinhTheme", () => {
  it("chế độ hệ thống KHÔNG đặt data-theme", () => {
    /* Gỡ hẳn thuộc tính là cách duy nhất để @media (prefers-color-scheme)
     * trong globals.css lên tiếng. Đặt data-theme="light" lúc hệ thống đang
     * sáng thì trông giống nhau ngay lúc đó, nhưng người dùng bật chế độ tối
     * của máy giữa chừng thì trang kẹt ở sáng. */
    expect(thuocTinhTheme("system")).toBeNull();
  });

  it("chế độ chọn tay ghi đè hệ thống", () => {
    expect(thuocTinhTheme("light")).toBe("light");
    expect(thuocTinhTheme("dark")).toBe("dark");
  });
});

describe("nhanCheDo", () => {
  it("mỗi chế độ một biểu tượng khác nhau", () => {
    const icons = (["system", "light", "dark"] as const).map((m) => nhanCheDo(m).icon);
    expect(new Set(icons).size).toBe(3);
  });

  it("nhãn nói chế độ ĐANG dùng và chế độ sẽ sang", () => {
    /* Nút ba trạng thái mà chỉ nói "chuyển sang X" thì người dùng trình đọc
     * màn hình không biết mình đang ở đâu trong vòng. */
    expect(nhanCheDo("system").nhan).toMatch(/hệ thống/i);
    expect(nhanCheDo("system").nhan).toMatch(/sáng/i);
    expect(nhanCheDo("light").nhan).toMatch(/tối/i);
    expect(nhanCheDo("dark").nhan).toMatch(/hệ thống/i);
  });
});
