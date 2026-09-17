import { describe, it, expect } from "vitest";
import {
  buildAuthorizeUrl,
  exchangeCodeForLogin,
  STATE_COOKIE_NAME,
} from "@/lib/auth";

describe("buildAuthorizeUrl", () => {
  it("dựng đúng URL uỷ quyền của GitHub", () => {
    const url = new URL(
      buildAuthorizeUrl("id-cua-app", "https://vi-du.test/api/auth/callback", "state-123"),
    );
    expect(url.origin + url.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("id-cua-app");
    expect(url.searchParams.get("redirect_uri")).toBe("https://vi-du.test/api/auth/callback");
    expect(url.searchParams.get("state")).toBe("state-123");
  });

  it("chỉ xin quyền đọc hồ sơ công khai", () => {
    /* Xác minh danh tính không cần quyền gì hơn. Xin repo hay user:email là
     * xin thứ mình không dùng, và là thứ sẽ mất nếu app bị chiếm. */
    const url = new URL(buildAuthorizeUrl("id", "https://vi-du.test/cb", "s"));
    const scope = url.searchParams.get("scope") ?? "";
    expect(scope).not.toContain("repo");
    expect(scope).not.toContain("write");
    expect(scope).not.toContain("delete");
  });
});

describe("exchangeCodeForLogin", () => {
  function fakeFetch(
    tokenResponse: unknown,
    userResponse: unknown,
    seen: string[] = [],
  ) {
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      seen.push(url);
      if (url.includes("access_token")) {
        if (init?.body) seen.push(String(init.body));
        return new Response(JSON.stringify(tokenResponse), {
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify(userResponse), {
        headers: { "content-type": "application/json" },
      });
    };
  }

  it("trả login khi đổi token thành công", async () => {
    const login = await exchangeCodeForLogin(
      "code-abc",
      "id",
      "secret",
      fakeFetch({ access_token: "gho_xyz" }, { login: "ai-do" }),
    );
    expect(login).toBe("ai-do");
  });

  it("trả null khi GitHub không trả access_token", async () => {
    const login = await exchangeCodeForLogin(
      "code-sai",
      "id",
      "secret",
      fakeFetch({ error: "bad_verification_code" }, {}),
    );
    expect(login).toBeNull();
  });

  it("trả null khi /user không có login", async () => {
    const login = await exchangeCodeForLogin(
      "code",
      "id",
      "secret",
      fakeFetch({ access_token: "gho_xyz" }, { message: "Bad credentials" }),
    );
    expect(login).toBeNull();
  });

  it("KHÔNG để lộ client_secret ra ngoài đường gọi token", async () => {
    const seen: string[] = [];
    await exchangeCodeForLogin(
      "code",
      "id",
      "sieu-bi-mat",
      fakeFetch({ access_token: "gho_xyz" }, { login: "ai-do" }, seen),
    );
    const urls = seen.filter((s) => s.startsWith("http"));
    for (const url of urls) {
      expect(url).not.toContain("sieu-bi-mat");
    }
    /* Secret chỉ được đi trong thân POST tới github.com, không đi trong URL
     * (URL vào log proxy và lịch sử trình duyệt) và không đi tới api.github.com. */
    const userCall = urls.find((u) => u.includes("api.github.com"));
    expect(userCall).toBeDefined();
  });
});

describe("hằng số", () => {
  it("cookie state có tên riêng, không trùng cookie session", () => {
    expect(STATE_COOKIE_NAME).toBe("dungca_blog_oauth_state");
  });
});
