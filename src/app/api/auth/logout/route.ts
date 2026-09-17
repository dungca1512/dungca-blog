import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/session";

export const dynamic = "force-dynamic";

/* POST chứ không GET: một <img src="/api/auth/logout"> trên trang bất kỳ sẽ
 * đá người dùng ra nếu đây là GET. Phiền chứ không nguy hiểm, nhưng vẫn là
 * thứ không nên để hở. */
export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return response;
}
