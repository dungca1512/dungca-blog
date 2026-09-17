import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { adminDb, setPostStatus } from "@/lib/admin-posts";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/* Tách publish khỏi PUT: publish có tác dụng phụ dọn cache, lưu nháp thì không. */
async function doiTrangThai(
  request: Request,
  context: Context,
  status: "draft" | "published",
) {
  if (!(await requireSession(request))) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "id không hợp lệ" }, { status: 400 });
  }

  const post = await setPostStatus(await adminDb(), id, status);
  if (!post) return NextResponse.json({ error: "Không tìm thấy bài" }, { status: 404 });

  /* Mọi nơi có thể giữ danh sách hay trang bài trong cache đều phải được dọn. */
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath(`/blog/${post.slug}`);
  revalidatePath("/sitemap.xml");
  return NextResponse.json({ post });
}

export async function POST(request: Request, context: Context) {
  return doiTrangThai(request, context, "published");
}

export async function DELETE(request: Request, context: Context) {
  return doiTrangThai(request, context, "draft");
}
