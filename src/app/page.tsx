import { BlogFeed } from "@/components/blog-feed";
import { getAllPosts } from "@/lib/content";

export default async function Home() {
  const posts = await getAllPosts();

  return <BlogFeed mode="home" posts={posts} />;
}
