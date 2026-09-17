import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import {
  signSession,
  verifySession,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/session";

const SECRET = "secret-chi-dung-trong-test-khong-phai-secret-that";
const NOW = 1_800_000_000;

describe("session", () => {
  it("ký rồi xác minh thì ra lại đúng payload", async () => {
    const token = await signSession({ login: "ai-do", exp: NOW + 100 }, SECRET);
    expect(await verifySession(token, SECRET, NOW)).toEqual({
      login: "ai-do",
      exp: NOW + 100,
    });
  });

  it("từ chối token ký bằng secret khác", async () => {
    const token = await signSession({ login: "ai-do", exp: NOW + 100 }, SECRET);
    expect(await verifySession(token, "secret-khac", NOW)).toBeNull();
  });

  it("từ chối khi payload bị sửa mà giữ nguyên chữ ký", async () => {
    /* Đây là tấn công thật: đổi login thành người khác rồi dán lại chữ ký cũ. */
    const token = await signSession({ login: "nguoi-thuong", exp: NOW + 100 }, SECRET);
    const [body, signature] = token.split(".");
    const forged = btoa(JSON.stringify({ login: "admin", exp: NOW + 100 }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(body).not.toEqual(forged);
    expect(await verifySession(`${forged}.${signature}`, SECRET, NOW)).toBeNull();
  });

  it("từ chối token đã hết hạn", async () => {
    const token = await signSession({ login: "ai-do", exp: NOW - 1 }, SECRET);
    expect(await verifySession(token, SECRET, NOW)).toBeNull();
  });

  it("chấp nhận token còn đúng một giây", async () => {
    const token = await signSession({ login: "ai-do", exp: NOW + 1 }, SECRET);
    expect(await verifySession(token, SECRET, NOW)).not.toBeNull();
  });

  it("trả null chứ không ném lỗi với rác", async () => {
    for (const rac of ["", ".", "a.b", "khong-co-dau-cham", "a.b.c", "!!!.???"]) {
      expect(await verifySession(rac, SECRET, NOW)).toBeNull();
    }
  });

  it("từ chối token không có chữ ký", async () => {
    const body = btoa(JSON.stringify({ login: "admin", exp: NOW + 100 }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(await verifySession(body, SECRET, NOW)).toBeNull();
    expect(await verifySession(`${body}.`, SECRET, NOW)).toBeNull();
  });

  it("hạn session là 30 ngày", () => {
    expect(SESSION_MAX_AGE_SECONDS).toBe(2_592_000);
  });

  it("tên cookie không đổi bất ngờ", () => {
    /* Đổi tên là mọi người đang đăng nhập bị đá ra. Test này để việc đó là
     * quyết định có ý thức chứ không phải tai nạn khi đổi tên biến. */
    expect(SESSION_COOKIE_NAME).toBe("dungca_blog_session");
  });
});

describe("verifySession — các nhánh từng lọt đột biến", () => {
  it("từ chối token hợp lệ bị nối thêm phần thứ ba", async () => {
    /* Đột biến bỏ `parts.length !== 2` sống sót qua cả 9 test cũ: khi đó
     * `<token hợp lệ>.x` được chấp nhận làm phiên hợp lệ. Test "a.b.c" cũ
     * không bắt được vì "b" vốn đã là base64 hỏng — nó đỏ vì lý do khác. */
    const token = await signSession({ login: "A", exp: NOW + 100 }, SECRET);
    expect(await verifySession(`${token}.x`, SECRET, NOW)).toBeNull();
  });

  it("từ chối token chỉ có phần thân, không có chữ ký", async () => {
    const token = await signSession({ login: "A", exp: NOW + 100 }, SECRET);
    const [body] = token.split(".");
    expect(await verifySession(body, SECRET, NOW)).toBeNull();
    expect(await verifySession(`${body}.`, SECRET, NOW)).toBeNull();
    expect(await verifySession(`.${body}`, SECRET, NOW)).toBeNull();
  });

  it("từ chối payload ký ĐÚNG nhưng sai kiểu trường", async () => {
    /* Đột biến bỏ `typeof login !== "string" || typeof exp !== "number"`
     * sống sót vì không test nào ký một payload dị dạng. Kẻ tấn công không
     * làm được việc này nếu không có secret — nhưng một lỗi ở Task 4 thì
     * làm được, và lúc đó login sẽ là thứ không phải chuỗi. */
    const dis = [
      { login: 123, exp: NOW + 100 },
      { login: "A", exp: "mai" },
      { login: "A" },
      { exp: NOW + 100 },
      { login: null, exp: NOW + 100 },
    ];
    for (const payload of dis) {
      const token = await signSession(
        payload as unknown as Parameters<typeof signSession>[0],
        SECRET,
      );
      expect(await verifySession(token, SECRET, NOW)).toBeNull();
    }
  });

  it("từ chối chữ ký bị đổi bit đệm (chuẩn tắc hoá)", async () => {
    /* Đổi ký tự base64url cuối giữ nguyên bit dữ liệu, chỉ đổi bit đệm.
     * Trước khi sửa, verifySession chấp nhận — nghĩa là một phiên có nhiều
     * biểu diễn chuỗi. */
    const token = await signSession({ login: "A", exp: NOW + 100 }, SECRET);
    const [body, sig] = token.split(".");
    const bangChu = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let daThu = false;
    for (const ch of bangChu) {
      if (ch === sig[sig.length - 1]) continue;
      const sigKhac = sig.slice(0, -1) + ch;
      if (await verifySession(`${body}.${sigKhac}`, SECRET, NOW)) {
        throw new Error(`chữ ký không chuẩn tắc vẫn được nhận: ...${ch}`);
      }
      daThu = true;
    }
    expect(daThu).toBe(true);
  });

  it("trả null khi secret rỗng, KHÔNG ném", async () => {
    const token = await signSession({ login: "A", exp: NOW + 100 }, SECRET);
    await expect(verifySession(token, "", NOW)).resolves.toBeNull();
  });

  it("trả null khi token không phải chuỗi, KHÔNG ném", async () => {
    const xau = [undefined, null, 123, {}, []];
    for (const t of xau) {
      await expect(
        verifySession(t as unknown as string, SECRET, NOW),
      ).resolves.toBeNull();
    }
  });
});

describe("signSession — đường ghi phải nổ to", () => {
  it("ném lỗi khi secret rỗng", async () => {
    /* Im lặng ký bằng secret rỗng là phát ra token ai cũng giả được. */
    await expect(signSession({ login: "A", exp: NOW + 100 }, "")).rejects.toThrow(
      /SESSION_SECRET/,
    );
  });
});

describe("ràng buộc không quan sát được từ hành vi", () => {
  /* Đột biến đổi crypto.subtle.verify thành `expected === signature` sống
   * sót qua cả 9 test cũ — và không thể bắt bằng hành vi, vì hai cách so
   * sánh cho CÙNG kết quả, chỉ khác thời gian. Nên canh trên mã nguồn,
   * cùng lối với tests/tokens.test.ts. Test yếu một cách có ý thức: nó canh
   * một ràng buộc không quan sát được từ bên ngoài. */
  const nguon = readFileSync("src/lib/session.ts", "utf8");

  it("so sánh chữ ký bằng crypto.subtle.verify", () => {
    expect(nguon).toContain("crypto.subtle.verify");
  });

  it("không so sánh chữ ký bằng toán tử bằng", () => {
    /* Bắt `=== signature`, `!== signature`, `=== expected`... Không bắt
     * phép so sánh chuẩn tắc hoá trong fromBase64Url vì vế phải là `value`. */
    expect(nguon).not.toMatch(/[!=]==\s*signature\b/);
    expect(nguon).not.toMatch(/\bsignature\s*[!=]==/);
  });
});
