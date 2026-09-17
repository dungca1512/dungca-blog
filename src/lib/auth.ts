import { cookies } from "next/headers";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { SESSION_COOKIE_NAME, verifySession, type SessionPayload } from "@/lib/session";

export const STATE_COOKIE_NAME = "dungca_blog_oauth_state";

export type AuthEnv = {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  SESSION_SECRET: string;
  ADMIN_GITHUB_LOGIN: string;
};

/* Ném lỗi thay vì trả giá trị mặc định khi thiếu biến. Một SESSION_SECRET
 * rỗng vẫn ký được token — và ai cũng ký được token y hệt. Hỏng ồn ào còn hơn
 * hỏng im lặng ở đúng chỗ này. */
export async function readAuthEnv(): Promise<AuthEnv> {
  const { env } = await getCloudflareContext({ async: true });
  const keys = [
    "GITHUB_CLIENT_ID",
    "GITHUB_CLIENT_SECRET",
    "SESSION_SECRET",
    "ADMIN_GITHUB_LOGIN",
  ] as const;

  const missing = keys.filter((key) => {
    const value = (env as unknown as Record<string, unknown>)[key];
    return typeof value !== "string" || value.length === 0;
  });

  if (missing.length > 0) {
    /* Chỉ nêu TÊN biến thiếu, không bao giờ nêu giá trị. */
    throw new Error(`Thiếu cấu hình auth: ${missing.join(", ")}`);
  }

  return Object.fromEntries(
    keys.map((key) => [key, (env as unknown as Record<string, string>)[key]]),
  ) as AuthEnv;
}

export function buildAuthorizeUrl(
  clientId: string,
  redirectUri: string,
  state: string,
): string {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  /* scope rỗng = chỉ hồ sơ công khai. Xác minh danh tính không cần hơn, và
   * quyền không xin là quyền không mất khi app bị chiếm. */
  url.searchParams.set("scope", "");
  return url.toString();
}

/* fetchImpl để test tiêm được bản giả. */
export async function exchangeCodeForLogin(
  code: string,
  clientId: string,
  clientSecret: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  /* Secret đi trong THÂN POST, không đi trong query string: URL nằm lại trong
   * log proxy, log truy cập và lịch sử trình duyệt. */
  let tokenResponse: Response;
  try {
    tokenResponse = await fetchImpl("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
      /* Không có timeout thì một phía treo kéo Worker treo theo tới khi bị
       * cắt cứng. AbortError rơi vào catch dưới, đi cùng đường với mọi lỗi
       * mạng khác: trả null. */
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    /* Chỉ log thông điệp lỗi — không log clientSecret, không log thân request.
     * Im lặng hoàn toàn thì lỗi mạng thật và bug lập trình của chính mình
     * trông giống hệt nhau khi soi log sản xuất. */
    console.warn(
      "exchangeCodeForLogin: gọi endpoint đổi token của GitHub thất bại:",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }

  if (!tokenResponse.ok) return null;

  const tokenBody = await parseJsonObject(tokenResponse);
  if (!tokenBody) return null;
  const accessToken = tokenBody.access_token;
  if (typeof accessToken !== "string" || accessToken.length === 0) return null;

  let userResponse: Response;
  try {
    userResponse = await fetchImpl("https://api.github.com/user", {
      headers: {
        authorization: `Bearer ${accessToken}`,
        accept: "application/vnd.github+json",
        /* GitHub API từ chối request không có User-Agent. */
        "user-agent": "dungca-blog",
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.warn(
      "exchangeCodeForLogin: gọi endpoint /user của GitHub thất bại:",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }

  if (!userResponse.ok) return null;

  const user = await parseJsonObject(userResponse);
  if (!user) return null;
  if (typeof user.login !== "string" || user.login.length === 0) return null;

  /* accessToken hết việc từ đây. Không lưu, không trả ra, không log. Nó ra
   * khỏi scope cùng hàm này. */
  return user.login;
}

/* .json() ném SyntaxError khi thân response không phải JSON hợp lệ (rỗng
 * cũng tính), và trả `null` khi thân là JSON "null" hợp lệ — giá trị mà
 * `typeof null === "object"` khiến việc đọc field bên dưới ném TypeError chứ
 * không trả undefined êm ái như ta tưởng. Đây là cửa vào duy nhất của admin:
 * một phản hồi dị dạng từ phía GitHub không được phép biến thành 500, nó
 * phải trở thành một lần đăng nhập thất bại bình thường. */
async function parseJsonObject(
  response: Response,
): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await response.json();
    if (typeof value !== "object" || value === null) return null;
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

/* Lõi. Mọi đường vào khu admin — route API lẫn trang server component — đi
 * qua đúng hàm này, nên không đường nào lệch luật với đường nào: không có
 * token thì null; ký sai hoặc hết hạn (verifySession lo) thì null; ký đúng
 * nhưng không phải admin thì cũng null. Ca cuối xảy ra khi ADMIN_GITHUB_LOGIN
 * bị đổi sau lúc cấp session — session cũ phải chết theo, không được sống
 * sót nhờ chữ ký còn hợp lệ. */
export async function xacThucToken(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;

  const env = await readAuthEnv();
  const session = await verifySession(token, env.SESSION_SECRET);
  if (!session) return null;

  if (session.login.toLowerCase() !== env.ADMIN_GITHUB_LOGIN.toLowerCase()) {
    return null;
  }

  return session;
}

/* Vỏ cho route API và middleware — cả hai nhận được một `Request` (NextRequest
 * kế thừa Request). Lớp phòng thủ thứ hai, gọi trong TỪNG route API ghi: có
 * middleware rồi vẫn cần, vì matcher là cấu hình, và cấu hình sai không kêu. */
export async function requireSession(request: Request): Promise<SessionPayload | null> {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.slice(SESSION_COOKIE_NAME.length + 1);

  return xacThucToken(token);
}

/* Vỏ cho server component ở khu admin — nơi không có `Request`, chỉ có
 * `cookies()` của next/headers. Next 16: cookies() là hàm async, phải await. */
export async function requireSessionTrenTrang(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return xacThucToken(token);
}
