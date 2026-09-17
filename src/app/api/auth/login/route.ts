import { NextResponse } from "next/server";

import { STATE_COOKIE_NAME, buildAuthorizeUrl, readAuthEnv } from "@/lib/auth";

/* Đụng env và sinh số ngẫu nhiên mỗi lần gọi: không có gì để prerender. */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const env = await readAuthEnv();

  /* state chống CSRF: kẻ tấn công dụ được nạn nhân mở URL callback của mình
   * thì cookie này không khớp, và ta từ chối. */
  const state = crypto.randomUUID();
  const redirectUri = new URL("/api/auth/callback", request.url).toString();

  const response = NextResponse.redirect(
    buildAuthorizeUrl(env.GITHUB_CLIENT_ID, redirectUri, state),
  );

  response.cookies.set(STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    /* 10 phút: đủ cho người bấm đồng ý trên GitHub, không đủ để nằm lại lâu. */
    maxAge: 600,
  });

  return response;
}
