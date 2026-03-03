import type { Metadata } from "next";
import Link from "next/link";

import { getAllPosts } from "@/lib/content";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Blog",
  description: "Danh sach bai viet Markdown.",
};

export default async function BlogPage() {
  const posts = await getAllPosts();

  return (
    <main className="section-stack page-shell">
      <section className="section-stack">
        <h1 className="page-title">Blog Markdown</h1>
        <p className="page-intro">
          Moi bai viet la 1 file <code>.md</code> trong <code>content/posts</code>
          .
        </p>
      </section>

      {posts.length === 0 ? (
        <p className="empty-box">
          Chua co bai viet nao. Hay tao file markdown dau tien trong
          <code> content/posts/</code>.
        </p>
      ) : (
        <section className="card-grid">
          {posts.map((post) => (
            <article className="card" key={post.slug}>
              <p className="meta-line">{formatDate(post.date)}</p>
              <h2>
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              <p>{post.summary}</p>

              {post.tags.length > 0 ? (
                <ul className="tag-list">
                  {post.tags.map((tag) => (
                    <li className="tag" key={tag}>
                      {tag}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
