import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { adminDb, createPost, listAllPosts, type PostInput } from "@/lib/admin-posts";

export const dynamic = "force-dynamic";

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

export async function GET(request: Request) {
  if (!(await requireSession(request))) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  return NextResponse.json({ posts: await listAllPosts(await adminDb()) });
}

export async function POST(request: Request) {
  if (!(await requireSession(request))) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const input = await readInput(request);
  if (!input) {
    return NextResponse.json({ error: "Bài viết phải có tiêu đề." }, { status: 400 });
  }

  return NextResponse.json({ post: await createPost(await adminDb(), input) }, { status: 201 });
}
