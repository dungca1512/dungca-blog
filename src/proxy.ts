import { NextResponse, type NextRequest } from "next/server";

import { requireSession } from "@/lib/auth";

/* Lớp phòng thủ thứ nhất. Route API vẫn tự kiểm tra lần nữa (requireSession):
 * matcher là cấu hình, mà cấu hình sai không kêu. Phải hỏng cả hai lớp mới
 * thủng vào được phần ghi dữ liệu. */
export async function proxy(request: NextRequest) {
  const session = await requireSession(request);
  if (session) return NextResponse.next();

  /* API trả 401 để fetch phía client đọc được; trang thì chuyển sang đăng
   * nhập, vì ném JSON vào mặt người đang mở trình duyệt là vô nghĩa. */
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/api/auth/login", request.url));
}

export const config = {
  /* "/admin/:path*" KHÔNG khớp "/admin" trần trong Next — phải liệt kê riêng.
   * Thiếu nó là trang danh sách bài mở tự do. */
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};
