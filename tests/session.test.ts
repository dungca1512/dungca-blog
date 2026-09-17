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
