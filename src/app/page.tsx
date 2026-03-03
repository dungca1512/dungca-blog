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
        <h1 className="page-title">Cong Anh Dung - AI/ML Engineer</h1>
        <p className="page-intro">
          Toi xay dung cac he thong AI van hanh thuc te: LLM gateway da provider,
          research agent workflows, ASR pipeline va nen tang du lieu thong minh.
          Day la noi toi chia se kinh nghiem engineering va cac ghi chu ML co ban.
        </p>
        <div className="actions">
          <a
            className="action-link"
            href="https://dungca1512.github.io/"
            rel="noreferrer"
            target="_blank"
          >
            Portfolio
          </a>
          <a
            className="action-link"
            href="https://github.com/dungca1512"
            rel="noreferrer"
            target="_blank"
          >
            GitHub dungca1512
          </a>
        </div>
      </section>

      <section className="card">
        <p className="meta-line">About</p>
        <h2>Toi la ai va toi xay dung gi?</h2>
        <ul className="path-list">
          <li>AI/ML Engineer tai Ha Noi, tap trung vao he thong AI do tin cay cao.</li>
          <li>
            Truc tiep xay AI Gateway (Java + Python) de hop nhat OpenAI, Gemini,
            Claude va local worker.
          </li>
          <li>
            Thiet ke research-agent pipeline bang LangChain/LangGraph cho quy
            trinh tim kiem va tong hop tai lieu.
          </li>
          <li>
            Trien khai Whisper fine-tuning cho ASR tieng Nhat va workflow train
            co the tai lap.
          </li>
        </ul>
      </section>

      <section className="card-grid">
        <article className="card">
          <p className="meta-line">Blog</p>
          <h2>Ghi chu ML va system design</h2>
          <p>
            Cac bai viet duoc viet bang Markdown, tap trung vao ML co ban, LLM
            infrastructure, va kinh nghiem lam AI production.
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
          <h2>Repo AI noi bat tu GitHub</h2>
          <p>
            Trang <code>/projects</code> ket hop demo viet tay va repo AI tu dong
            quet tu GitHub <code>{showcase.username}</code>.
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
        <p className="meta-line">Featured repos</p>
        <h2>Mot so repo dang tap trung</h2>
        {showcase.repositories.length === 0 ? (
          <p className="page-intro">
            Tam thoi chua lay duoc repo AI tu GitHub trong lan build nay.
          </p>
        ) : (
          <div className="card-grid">
            {showcase.repositories.slice(0, 4).map((repo) => (
              <article className="card" key={repo.fullName}>
                <h3>
                  <a href={repo.url} rel="noreferrer" target="_blank">
                    {repo.name}
                  </a>
                </h3>
                <p>{repo.description || "Repository AI thuc chien."}</p>
                <p className="meta-line">{repo.language}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Thu muc de viet bai nhanh</h2>
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
