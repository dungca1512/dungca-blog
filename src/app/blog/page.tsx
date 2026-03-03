import type { Metadata } from "next";

import { BlogFeed } from "@/components/blog-feed";
import { getAllPosts } from "@/lib/content";

export const metadata: Metadata = {
  title: "Blog",
  description: "Danh sách bài viết Markdown.",
};

export default async function BlogPage() {
  const posts = await getAllPosts();

  return <BlogFeed mode="blog" posts={posts} />;
}
