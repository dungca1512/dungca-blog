import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import {
  adminDb,
  deletePost,
  findPostById,
  updatePost,
  type PostInput,
} from "@/lib/admin-posts";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

async function readId(context: Context): Promise<number | null> {
  const { id } = await context.params;
  const parsed = Number(id);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function readInput(request: Request): Promise<PostInput | null> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return null;
  }

  if (typeof body !== "object" || body === null) return null;
  const { title, summary, tags, bodyMarkdown } = body as Record<string, unknown>;
  if (typeof title !== "string" || title.trim().length === 0) return null;

  return {
    title: title.trim(),
    summary: typeof summary === "string" ? summary : "",
    tags: Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === "string") : [],
    bodyMarkdown: typeof bodyMarkdown === "string" ? bodyMarkdown : "",
  };
}

export async function GET(request: Request, context: Context) {
  if (!(await requireSession(request))) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  const id = await readId(context);
  if (id === null) return NextResponse.json({ error: "id không hợp lệ" }, { status: 400 });

  const post = await findPostById(await adminDb(), id);
  if (!post) return NextResponse.json({ error: "Không tìm thấy bài" }, { status: 404 });
  return NextResponse.json({ post });
}

export async function PUT(request: Request, context: Context) {
  if (!(await requireSession(request))) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  const id = await readId(context);
  if (id === null) return NextResponse.json({ error: "id không hợp lệ" }, { status: 400 });
  const input = await readInput(request);
  if (!input) {
    return NextResponse.json({ error: "Bài viết phải có tiêu đề." }, { status: 400 });
  }

  const post = await updatePost(await adminDb(), id, input);
  if (!post) return NextResponse.json({ error: "Không tìm thấy bài" }, { status: 404 });
  return NextResponse.json({ post });
}

export async function DELETE(request: Request, context: Context) {
  if (!(await requireSession(request))) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  const id = await readId(context);
  if (id === null) return NextResponse.json({ error: "id không hợp lệ" }, { status: 400 });
  if (!(await deletePost(await adminDb(), id))) {
    return NextResponse.json({ error: "Không tìm thấy bài" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
