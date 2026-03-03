import Link from "next/link";

import { getAllPosts, getAllProjects } from "@/lib/content";
import { getShowcaseRepositories } from "@/lib/github";

export default async function Home() {
  const [posts, projects, showcase] = await Promise.all([
    getAllPosts(),
    getAllProjects(),
    getShowcaseRepositories(),
  ]);

  return (
    <main className="section-stack page-shell">
      <section className="section-stack">
        <h1 className="page-title">Blog + AI Showcase</h1>
        <p className="page-intro">
          Day la bo khung de ban viet bai bang Markdown va demo cac repository AI
          tren GitHub.
        </p>
      </section>

      <section className="card-grid">
        <article className="card">
          <p className="meta-line">Blog</p>
          <h2>Viet bai bang Markdown</h2>
          <p>
            Them file <code>.md</code> vao <code>content/posts/</code>. Moi bai
            se tu dong duoc render thanh trang <code>/blog/[slug]</code>.
          </p>
          <p className="meta-line">{posts.length} bai dang publish</p>
          <div className="actions">
            <Link className="action-link" href="/blog">
              Xem danh sach bai viet
            </Link>
          </div>
        </article>

        <article className="card">
          <p className="meta-line">AI Demos</p>
          <h2>Demo repo AI tu GitHub</h2>
          <p>
            Trang <code>/projects</code> gom 2 phan: demo viet tay bang Markdown
            va danh sach repo AI tu dong lay tu GitHub <code>
              {showcase.username}
            </code>
            .
          </p>
          <p className="meta-line">
            {projects.length} demo Markdown · {showcase.repositories.length} repo
            AI
          </p>
          <div className="actions">
            <Link className="action-link" href="/projects">
              Mo trang AI demos
            </Link>
          </div>
        </article>
      </section>

      <section className="card">
        <h2>Thu muc ban can dung hang ngay</h2>
        <ul className="path-list">
          <li>
            <code>content/posts/</code>: bai viet blog.
          </li>
          <li>
            <code>content/projects/</code>: bai demo du an AI.
          </li>
          <li>
            <code>content/projects/featured-repos.json</code>: danh sach repo
            uu tien + username GitHub.
          </li>
        </ul>
      </section>
    </main>
  );
}
