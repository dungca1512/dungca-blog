/* Session tự ký bằng WebCrypto, không dùng thư viện auth.
 *
 * Định dạng: "<payload base64url>.<chữ ký HMAC-SHA256 base64url>".
 * Payload KHÔNG mã hoá, chỉ được ký — nó chỉ chứa login và hạn dùng, không có
 * gì bí mật. Thứ nó bảo đảm là "không ai sửa được", không phải "không ai đọc
 * được".
 *
 * Không có state phía server: không bảng session, không cách thu hồi một
 * session lẻ. Đổi SESSION_SECRET là đá toàn bộ ra, và với blog một người dùng
 * thì đó đúng là công cụ thu hồi cần có. */

export const SESSION_COOKIE_NAME = "dungca_blog_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type SessionPayload = {
  login: string;
  /* Epoch GIÂY, không phải mili giây. Date.now()/1000. */
  exp: number;
};

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/* Ghi rõ Uint8Array<ArrayBuffer> chứ không để suy luận ra Uint8Array<ArrayBufferLike>:
 * crypto.subtle.verify đòi BufferSource, thứ không nhận ArrayBufferLike (bao gồm
 * cả SharedArrayBuffer). TS 5.7+ generic hoá Uint8Array nên phải ghi tường minh. */
function fromBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  try {
    /* Chỉ đổi bảng chữ base64url → base64 chuẩn. KHÔNG thêm lại dấu "=":
     * atob theo chuẩn forgiving-base64 nên tự bù được phần đệm thiếu. Sự
     * thật ngầm này đáng ghi ra vì nó khiến hàm trông như quên một bước. */
    const chuanBase64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(chuanBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    /* Đúng một chuỗi ứng với một chuỗi byte. Vì forgiving-base64 bỏ qua các
     * bit đệm thừa, "...I" và "...9" giải mã ra cùng byte — nếu không chặn
     * thì một phiên có nhiều biểu diễn chuỗi, và mọi thứ về sau đánh dấu
     * theo chuỗi token (denylist, cache-key, khử trùng lặp log) đều lách
     * được. Phép so sánh này KHÔNG đụng secret nên dùng !== là an toàn. */
    if (toBase64Url(bytes) !== value) return null;
    return bytes;
  } catch {
    return null;
  }
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSession(
  payload: SessionPayload,
  secret: string,
): Promise<string> {
  /* Ký bằng secret rỗng là phát ra token mà ai cũng giả được. Nổ ở đây, lúc
   * phát, còn hơn phát ra rồi mới phát hiện. */
  if (!secret) {
    throw new Error("signSession: SESSION_SECRET rỗng hoặc chưa đặt");
  }
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(secret),
    new TextEncoder().encode(body),
  );
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifySession(
  token: string,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<SessionPayload | null> {
  /* Hai thứ này lẽ ra không xảy ra nếu call site đúng kiểu. Nhưng đây là
   * hàng rào bảo mật, và hàng rào không được đổ: secret rỗng thì
   * crypto.subtle.importKey ném DataError, token không phải chuỗi thì .split
   * ném TypeError. Cả hai đều biến một request thành 500 thay vì một lần
   * chuyển hướng về đăng nhập. Chỗ hét lên vì thiếu biến môi trường là
   * readAuthEnv() lúc đọc cấu hình, không phải giữa đường kiểm cookie. */
  if (typeof token !== "string" || !token) return null;
  if (!secret) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [body, signature] = parts;
  if (!body || !signature) return null;

  const signatureBytes = fromBase64Url(signature);
  if (!signatureBytes) return null;

  /* crypto.subtle.verify so sánh trong thời gian hằng định. Đừng thay bằng
   * `signHere === signature` — so sánh chuỗi thoát sớm ở byte đầu khác nhau,
   * và thời gian thoát đó rò rỉ chữ ký đúng từng byte một. */
  const valid = await crypto.subtle.verify(
    "HMAC",
    await hmacKey(secret),
    signatureBytes,
    new TextEncoder().encode(body),
  );
  if (!valid) return null;

  const bodyBytes = fromBase64Url(body);
  if (!bodyBytes) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bodyBytes));
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const { login, exp } = parsed as Record<string, unknown>;
  if (typeof login !== "string" || typeof exp !== "number") return null;

  /* Hạn kiểm SAU khi xác minh chữ ký, không phải trước: kiểm trước là trả lời
   * "token này hết hạn chưa" cho cả token giả, một kênh rò rỉ nhỏ và miễn phí
   * để bịt. */
  if (exp <= nowSeconds) return null;

  return { login, exp };
}
