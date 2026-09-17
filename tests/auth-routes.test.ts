import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* Route đọc env qua getCloudflareContext, thứ chỉ tồn tại trong workerd.
 * Giả lập ở đây để gọi thẳng GET/POST như hàm thường. */
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: async () => ({
    env: {
      GITHUB_CLIENT_ID: "client-id-gia",
      GITHUB_CLIENT_SECRET: "client-secret-gia",
      SESSION_SECRET: "session-secret-gia-khong-phai-secret-that",
      ADMIN_GITHUB_LOGIN: "admin-gia",
    },
  }),
}));

import { GET as callbackGet } from "@/app/api/auth/callback/route";
import { GET as loginGet } from "@/app/api/auth/login/route";
import * as logoutModule from "@/app/api/auth/logout/route";
import { STATE_COOKIE_NAME } from "@/lib/auth";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/session";

/* Mọi test 403 đi qua tuChoi(), thứ ghi console.warn. Im lặng nó để output
 * test không lẫn cảnh báo cố ý với lỗi thật. */
beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

type ThanGia = { json: unknown } | { raw: string };

function thanhResponse(spec: ThanGia): Response {
  if ("raw" in spec) return new Response(spec.raw);
  return new Response(JSON.stringify(spec.json));
}

/* Giả lập fetch toàn cục mà exchangeCodeForLogin gọi tới GitHub. Phân biệt
 * hai lời gọi bằng URL, không quan tâm thứ tự gọi thật. */
function gioLapFetchGithub(tokenSpec: ThanGia, userSpec: ThanGia) {
  vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("access_token")) return thanhResponse(tokenSpec);
    return thanhResponse(userSpec);
  });
}

const TOKEN_OK: ThanGia = { json: { access_token: "gho_gia" } };

describe("GET /api/auth/callback — rào state", () => {
  it("không có cookie state → 403", async () => {
    const res = await callbackGet(
      new Request("https://vd.test/api/auth/callback?code=x&state=y"),
    );
    expect(res.status).toBe(403);
  });

  it('state="" trong URL và cookie state cũng rỗng → 403 (bẫy "" === "")', async () => {
    const res = await callbackGet(
      new Request("https://vd.test/api/auth/callback?code=x&state=", {
        headers: { cookie: `${STATE_COOKIE_NAME}=` },
      }),
    );
    expect(res.status).toBe(403);
  });

  it("thiếu cả code lẫn state → 403", async () => {
    const res = await callbackGet(new Request("https://vd.test/api/auth/callback"));
    expect(res.status).toBe(403);
  });

  it("có cookie state nhưng URL thiếu state → 403", async () => {
    const res = await callbackGet(
      new Request("https://vd.test/api/auth/callback?code=x", {
        headers: { cookie: `${STATE_COOKIE_NAME}=abc` },
      }),
    );
    expect(res.status).toBe(403);
  });

  it("state khớp cookie nhưng code thiếu → 403", async () => {
    const res = await callbackGet(
      new Request("https://vd.test/api/auth/callback?state=abc", {
        headers: { cookie: `${STATE_COOKIE_NAME}=abc` },
      }),
    );
    expect(res.status).toBe(403);
  });

  it("nhánh từ chối (403) cũng xoá cookie state, không chỉ nhánh thành công", async () => {
    const res = await callbackGet(new Request("https://vd.test/api/auth/callback"));
    expect(res.status).toBe(403);
    const setCookie = res.headers.getSetCookie().find((c) => c.startsWith(`${STATE_COOKIE_NAME}=`));
    expect(setCookie).toBeDefined();
    expect(setCookie).toMatch(/Max-Age=0/);
  });
});

describe("GET /api/auth/callback — tách cookie state khỏi header Cookie", () => {
  /* Cả bốn ca đều dùng cùng state param "THAT-hoac-tuong-duong" khớp với
   * cookie thật, và giả fetch trả admin hợp lệ — nếu tách cookie sai giá
   * trị, request sẽ dừng ở 403 "state không khớp" thay vì redirect. */
  beforeEach(() => {
    gioLapFetchGithub(TOKEN_OK, { json: { login: "admin-gia" } });
  });

  it("mồi nhử cùng tiền tố tên (dungca_blog_oauth_state_khac) → vẫn lấy đúng giá trị thật", async () => {
    const res = await callbackGet(
      new Request("https://vd.test/api/auth/callback?code=c&state=THAT", {
        headers: {
          cookie: `dungca_blog_oauth_state_khac=GIA; ${STATE_COOKIE_NAME}=THAT`,
        },
      }),
    );
    expect(res.status).toBe(307);
  });

  it("mồi nhử cùng hậu tố tên (x_dungca_blog_oauth_state) → vẫn lấy đúng giá trị thật", async () => {
    const res = await callbackGet(
      new Request("https://vd.test/api/auth/callback?code=c&state=THAT", {
        headers: {
          cookie: `x_${STATE_COOKIE_NAME}=GIA; ${STATE_COOKIE_NAME}=THAT`,
        },
      }),
    );
    expect(res.status).toBe(307);
  });

  it("mồi nhử đặt trước cookie thật trong chuỗi → vẫn lấy đúng giá trị thật", async () => {
    const res = await callbackGet(
      new Request("https://vd.test/api/auth/callback?code=c&state=THAT", {
        headers: { cookie: `mot_cookie_khac=xyz; ${STATE_COOKIE_NAME}=THAT` },
      }),
    );
    expect(res.status).toBe(307);
  });

  it("giá trị cookie chứa dấu = → giữ nguyên phần sau dấu = đầu tiên", async () => {
    const res = await callbackGet(
      new Request("https://vd.test/api/auth/callback?code=c&state=a=b=c", {
        headers: { cookie: `${STATE_COOKIE_NAME}=a=b=c` },
      }),
    );
    expect(res.status).toBe(307);
  });
});

describe("GET /api/auth/callback — so sánh login với admin", () => {
  function req(state = "s") {
    return new Request(`https://vd.test/api/auth/callback?code=c&state=${state}`, {
      headers: { cookie: `${STATE_COOKIE_NAME}=${state}` },
    });
  }

  it("login đúng admin nhưng khác hoa thường → cho qua", async () => {
    gioLapFetchGithub(TOKEN_OK, { json: { login: "Admin-Gia" } });
    const res = await callbackGet(req());
    expect(res.status).toBe(307);
  });

  it("login là người khác → 403", async () => {
    gioLapFetchGithub(TOKEN_OK, { json: { login: "khong-phai-admin" } });
    const res = await callbackGet(req());
    expect(res.status).toBe(403);
  });

  it("GitHub trả JSON không có login → 403 (không 500)", async () => {
    gioLapFetchGithub(TOKEN_OK, { json: {} });
    const res = await callbackGet(req());
    expect(res.status).toBe(403);
  });

  it("GitHub trả body không phải JSON → 403 (không 500)", async () => {
    gioLapFetchGithub(TOKEN_OK, { raw: "khong-phai-json" });
    const res = await callbackGet(req());
    expect(res.status).toBe(403);
  });

  it("GitHub trả body null → 403 (không 500)", async () => {
    gioLapFetchGithub(TOKEN_OK, { json: null });
    const res = await callbackGet(req());
    expect(res.status).toBe(403);
  });
});

describe("GET /api/auth/callback — cookie phiên ở nhánh thành công", () => {
  it("set-cookie của phiên có đủ HttpOnly, Secure, SameSite=Lax, Path=/, Max-Age đúng hạn", async () => {
    gioLapFetchGithub(TOKEN_OK, { json: { login: "admin-gia" } });
    const res = await callbackGet(
      new Request("https://vd.test/api/auth/callback?code=c&state=s", {
        headers: { cookie: `${STATE_COOKIE_NAME}=s` },
      }),
    );
    const sessionCookie = res.headers
      .getSetCookie()
      .find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
    expect(sessionCookie).toBeDefined();
    const cookie = sessionCookie as string;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Path=\//);
    expect(cookie).toMatch(new RegExp(`Max-Age=${SESSION_MAX_AGE_SECONDS}\\b`));
  });
});

describe("POST /api/auth/logout", () => {
  it("module chỉ xuất POST, không có GET", () => {
    expect(Object.keys(logoutModule)).not.toContain("GET");
  });

  it("cookie xoá session có Path=/ và Max-Age=0", async () => {
    const res = await logoutModule.POST(
      new Request("https://vd.test/api/auth/logout", { method: "POST" }),
    );
    const cookie = res.headers
      .getSetCookie()
      .find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/Path=\//);
    expect(cookie).toMatch(/Max-Age=0\b/);
  });
});

describe("GET /api/auth/login", () => {
  it("đặt cookie state với HttpOnly, Secure, SameSite=Lax, Path=/, Max-Age=600", async () => {
    const res = await loginGet(new Request("https://vd.test/api/auth/login"));
    const cookie = res.headers
      .getSetCookie()
      .find((c) => c.startsWith(`${STATE_COOKIE_NAME}=`));
    expect(cookie).toBeDefined();
    const value = cookie as string;
    expect(value).toMatch(/HttpOnly/i);
    expect(value).toMatch(/Secure/i);
    expect(value).toMatch(/SameSite=Lax/i);
    expect(value).toMatch(/Path=\//);
    expect(value).toMatch(/Max-Age=600\b/);
  });

  it("URL chuyển hướng không chứa client_secret", async () => {
    const res = await loginGet(new Request("https://vd.test/api/auth/login"));
    const location = res.headers.get("location") ?? "";
    expect(location).not.toContain("client-secret-gia");
    expect(location).not.toContain("client_secret");
  });
});
