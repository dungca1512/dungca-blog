import { BlogFeed } from "@/components/blog-feed";
import { getAllPosts } from "@/lib/posts";

/* Đọc D1 nên không prerender lúc build được — xem comment ở
 * /api/search-index. Trang render mỗi request; D1 nhanh và đây chính là
 * thứ đổi lấy "đăng bài là thấy ngay". */
export const dynamic = "force-dynamic";

export default async function Home() {
  const posts = await getAllPosts();

  return <BlogFeed mode="home" posts={posts} />;
}
