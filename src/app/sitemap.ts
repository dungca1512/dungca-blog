import type { MetadataRoute } from "next";

import { getAllPosts } from "@/lib/posts";
import { getAllProjects } from "@/lib/projects";
import { absoluteUrl } from "@/lib/site";

/* Đọc D1 nên không prerender lúc build được — xem comment ở
 * /api/search-index. Trang render mỗi request; D1 nhanh và đây chính là
 * thứ đổi lấy "đăng bài là thấy ngay". */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, projects] = await Promise.all([getAllPosts(), getAllProjects()]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/blog/"), changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/projects/"), changeFrequency: "monthly", priority: 0.7 },
  ];

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}/`),
    lastModified: post.date,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const projectRoutes: MetadataRoute.Sitemap = projects.map((project) => ({
    url: absoluteUrl(`/projects/${project.slug}/`),
    lastModified: project.date,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...postRoutes, ...projectRoutes];
}
