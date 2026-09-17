import { afterEach, describe, expect, it, vi } from "vitest";

const ENV_GIA = {
  GITHUB_CLIENT_ID: "client-id-gia",
  GITHUB_CLIENT_SECRET: "client-secret-gia",
  SESSION_SECRET: "session-secret-gia-khong-phai-secret-that",
  ADMIN_GITHUB_LOGIN: "chu-blog",
};

/* Route và middleware đọc env qua getCloudflareContext, thứ chỉ tồn tại
 * trong workerd. Giả lập theo đúng lối tests/auth-routes.test.ts đã dùng. */
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: async () => ({ env: ENV_GIA }),
}));

/* requireSessionTrenTrang không có Request, chỉ có cookies() của
 * next/headers — giả lập một cookie jar tối giản để test không cần chạy
 * trong server component thật. */
const cookieJarGia = { value: undefined as string | undefined };
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === SESSION_COOKIE_NAME && cookieJarGia.value !== undefined
        ? { name, value: cookieJarGia.value }
        : undefined,
  }),
}));

import { requireSession, requireSessionTrenTrang, xacThucToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME, signSession } from "@/lib/session";

afterEach(() => {
  cookieJarGia.value = undefined;
});

async function taoTokenHopLe(login = ENV_GIA.ADMIN_GITHUB_LOGIN): Promise<string> {
  return signSession(
    { login, exp: Math.floor(Date.now() / 1000) + 3600 },
    ENV_GIA.SESSION_SECRET,
  );
}

describe("xacThucToken — lõi dùng chung", () => {
  it("không có token → null", async () => {
    expect(await xacThucToken(undefined)).toBeNull();
  });

  it("token ký sai → null", async () => {
    expect(await xacThucToken("khong-phai-token-hop-le")).toBeNull();
  });

  it("token ký hợp lệ, đúng admin → trả session", async () => {
    const token = await taoTokenHopLe();
    expect(await xacThucToken(token)).toEqual({
      login: ENV_GIA.ADMIN_GITHUB_LOGIN,
      exp: expect.any(Number),
    });
  });

  it("token ký hợp lệ nhưng cho người khác → null", async () => {
    /* Session ký đúng nhưng cho một login khác ADMIN_GITHUB_LOGIN. Xảy ra khi
     * ADMIN_GITHUB_LOGIN bị đổi sau lúc cấp session — session cũ phải chết. */
    const token = await taoTokenHopLe("nguoi-khac");
    expect(await xacThucToken(token)).toBeNull();
  });

  it("so admin không phân biệt hoa thường", async () => {
    const token = await taoTokenHopLe(ENV_GIA.ADMIN_GITHUB_LOGIN.toUpperCase());
    expect(await xacThucToken(token)).not.toBeNull();
  });
});

describe("requireSession — vỏ cho Request (route API và middleware)", () => {
  it("không có cookie session → null", async () => {
    const req = new Request("https://vd.test/api/admin/posts");
    expect(await requireSession(req)).toBeNull();
  });

  it("có cookie session hợp lệ → trả session", async () => {
    const token = await taoTokenHopLe();
    const req = new Request("https://vd.test/api/admin/posts", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
    });
    expect(await requireSession(req)).toEqual({
      login: ENV_GIA.ADMIN_GITHUB_LOGIN,
      exp: expect.any(Number),
    });
  });

  it("cookie khác tên đứng trước không được nhận nhầm là cookie session", async () => {
    const token = await taoTokenHopLe();
    const req = new Request("https://vd.test/api/admin/posts", {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}_khac=moi_nhu; ${SESSION_COOKIE_NAME}=${token}`,
      },
    });
    expect(await requireSession(req)).not.toBeNull();
  });
});

describe("requireSessionTrenTrang — vỏ cho server component (cookies() async)", () => {
  it("không có cookie session → null", async () => {
    expect(await requireSessionTrenTrang()).toBeNull();
  });

  it("có cookie session hợp lệ → trả session", async () => {
    cookieJarGia.value = await taoTokenHopLe();
    expect(await requireSessionTrenTrang()).toEqual({
      login: ENV_GIA.ADMIN_GITHUB_LOGIN,
      exp: expect.any(Number),
    });
  });
});
