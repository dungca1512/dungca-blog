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
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
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
