import { readFileSync } from "node:fs";
import { describe, it, expect, vi } from "vitest";

import { createSearchIndexLoader } from "@/lib/search-index-loader";

const MOT_BAI = [
  { slug: "bai-mot", title: "Bài một", summary: "", tags: [], date: "2026-03-03" },
];

/* Hoãn phản hồi để mô phỏng đúng cái cửa sổ gây lỗi: người dùng chạm ô tìm
 * kiếm lần hai TRONG LÚC request thứ nhất còn bay. */
function fetchHoan() {
  let moKhoa: (gia: unknown) => void = () => {};
  const cho = new Promise((resolve) => {
    moKhoa = resolve;
  });
  const goi = vi.fn(async () => {
    await cho;
    return { ok: true, json: async () => MOT_BAI } as Response;
  });

  return { goi, moKhoa };
}

describe("createSearchIndexLoader", () => {
  it("gộp các lượt gọi chồng nhau thành một request", async () => {
    const { goi, moKhoa } = fetchHoan();
    const load = createSearchIndexLoader(goi);

    const lan1 = load();
    const lan2 = load();
    const lan3 = load();
    moKhoa(null);

    expect(await lan1).toEqual(MOT_BAI);
    expect(await lan2).toEqual(MOT_BAI);
    expect(await lan3).toEqual(MOT_BAI);
    expect(goi).toHaveBeenCalledTimes(1);
  });

  it("nạp xong rồi thì không gọi mạng nữa", async () => {
    const goi = vi.fn(async () => ({ ok: true, json: async () => MOT_BAI }) as Response);
    const load = createSearchIndexLoader(goi);

    await load();
    await load();

    expect(goi).toHaveBeenCalledTimes(1);
  });

  it("mạng chập trả null và lần sau thử lại", async () => {
    const goi = vi
      .fn<() => Promise<Response>>()
      .mockRejectedValueOnce(new Error("mất mạng"))
      .mockResolvedValueOnce({ ok: true, json: async () => MOT_BAI } as Response);
    const load = createSearchIndexLoader(goi);

    expect(await load()).toBeNull();
    expect(await load()).toEqual(MOT_BAI);
    expect(goi).toHaveBeenCalledTimes(2);
  });

  it("phản hồi không ok trả null và không bị ghi nhớ", async () => {
    const goi = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => MOT_BAI } as Response);
    const load = createSearchIndexLoader(goi);

    expect(await load()).toBeNull();
    expect(await load()).toEqual(MOT_BAI);
  });

  it("JSON không phải mảng bị từ chối — nếu lọt, posts.map sập cả site", async () => {
    const goi = vi.fn(
      async () => ({ ok: true, json: async () => ({ error: "boom" }) }) as Response,
    );
    const load = createSearchIndexLoader(goi);

    expect(await load()).toBeNull();
  });
});

/* Lõi trên chỉ có giá trị nếu TopSearch thật sự dùng nó. Không có DOM trong
 * bộ test này, nên dây nối được khoá bằng cách đọc nguồn — cùng lối với
 * tests/theme-toggle.test.ts và tests/post-editor.test.ts. */
describe("TopSearch dùng lõi này", () => {
  const nguon = readFileSync("src/components/top-search.tsx", "utf8");

  it("nhập createSearchIndexLoader", () => {
    expect(nguon).toContain("createSearchIndexLoader");
  });

  it("không còn gọi fetch(\"/api/search-index\") thẳng trong component", () => {
    expect(nguon).not.toMatch(/fetch\(\s*"\/api\/search-index"/);
  });
});
