import { BlogFeed } from "@/components/blog-feed";
import { getAllPosts, getAllProjects } from "@/lib/content";
import { getShowcaseRepositories } from "@/lib/github";

export default async function Home() {
  const [posts, projects, showcase] = await Promise.all([
    getAllPosts(),
    getAllProjects(),
    getShowcaseRepositories(),
  ]);

  return (
    <BlogFeed
      mode="home"
      posts={posts}
      projectCount={projects.length}
      repoCount={showcase.repositories.length}
    />
  );
}
