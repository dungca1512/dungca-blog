import { getAllPosts } from "@/lib/posts";

/* Chỉ mục tìm kiếm phải đọc D1, mà lúc `next build` đọc D1 là hỏng build
 * (mỗi lần đọc rò một instance workerd, vài trang là tranh khoá SQLite).
 * force-dynamic để route này không bị prerender. */
export const dynamic = "force-dynamic";

/* force-dynamic khiến Next tự gắn `no-store`, nên phải ghi đè bằng tay.
 * Chỉ mục chỉ chứa bài đã đăng (listPublishedPosts lọc status='published')
 * nên `public` là an toàn — không có gì riêng tư trong đó.
 *
 * max-age=60: trình duyệt khỏi hỏi lại khi người dùng chạm ô tìm kiếm ở
 * nhiều trang liên tiếp. s-maxage/stale-while-revalidate dành cho lớp CDN
 * nếu sau này đặt cache trước Worker — Cloudflare không tự cache phản hồi
 * của Worker, nên hôm nay hai chỉ thị đó chưa có tác dụng gì.
 *
 * Cái giá: bài vừa đăng có thể chưa xuất hiện trong ô tìm kiếm trong tối đa
 * một phút. Trang /blog và /blog/<slug> không bị ảnh hưởng. */
const CACHE_CONTROL = "public, max-age=60, s-maxage=300, stale-while-revalidate=3600";

export async function GET() {
  const posts = await getAllPosts();

  return Response.json(posts, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
