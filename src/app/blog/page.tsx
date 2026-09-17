import type { Metadata } from "next";

import { BlogFeed } from "@/components/blog-feed";
import { getAllPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Blog",
  description: "Danh sách bài viết Markdown.",
  alternates: {
    canonical: "/blog/",
  },
};

/* Đọc D1 nên không prerender lúc build được — xem comment ở
 * /api/search-index. Trang render mỗi request; D1 nhanh và đây chính là
 * thứ đổi lấy "đăng bài là thấy ngay". */
export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const posts = await getAllPosts();

  return <BlogFeed mode="blog" posts={posts} />;
}
