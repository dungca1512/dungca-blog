import { NextResponse } from "next/server";

import { STATE_COOKIE_NAME, exchangeCodeForLogin, readAuthEnv } from "@/lib/auth";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  signSession,
} from "@/lib/session";

export const dynamic = "force-dynamic";

function tuChoi(message: string) {
  /* Không nêu lý do cụ thể cho người dùng: "login sai" và "state sai" là hai
   * thông tin khác nhau, và gộp chúng lại làm việc dò tìm khó hơn một chút mà
   * không tốn gì. Lý do thật nằm ở message để đọc trong wrangler tail. */
  console.warn(`Từ chối đăng nhập: ${message}`);
  return new NextResponse("Không thể đăng nhập.", { status: 403 });
}

export async function GET(request: Request) {
  const env = await readAuthEnv();
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${STATE_COOKIE_NAME}=`))
    ?.slice(STATE_COOKIE_NAME.length + 1);

  if (!code || !state || !expectedState || state !== expectedState) {
    return tuChoi("state không khớp hoặc thiếu code");
  }

  const login = await exchangeCodeForLogin(
    code,
    env.GITHUB_CLIENT_ID,
    env.GITHUB_CLIENT_SECRET,
  );

  if (!login) {
    return tuChoi("đổi code lấy danh tính thất bại");
  }

  /* So sánh không phân biệt hoa thường: GitHub không phân biệt hoa thường
   * trong username, nên "TenNguoiDung" và "tennguoidung" là cùng một người. */
  if (login.toLowerCase() !== env.ADMIN_GITHUB_LOGIN.toLowerCase()) {
    return tuChoi(`login "${login}" không phải admin`);
  }

  const token = await signSession(
    { login, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS },
    env.SESSION_SECRET,
  );

  const response = NextResponse.redirect(new URL("/admin", request.url));

  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  /* Cookie state hết việc. Để lại là để lại rác có thời hạn. */
  response.cookies.set(STATE_COOKIE_NAME, "", { path: "/", maxAge: 0 });

  return response;
}
