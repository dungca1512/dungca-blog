import { getAllPosts } from "@/lib/posts";

/* Chỉ mục tìm kiếm phải đọc D1, mà lúc `next build` đọc D1 là hỏng build
 * (mỗi lần đọc rò một instance workerd, vài trang là tranh khoá SQLite).
 * force-dynamic để route này không bị prerender. */
export const dynamic = "force-dynamic";

export async function GET() {
  const posts = await getAllPosts();

  return Response.json(posts);
}
