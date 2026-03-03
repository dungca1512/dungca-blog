import type { Metadata } from "next";
import Link from "next/link";

import { getAllProjects } from "@/lib/content";
import {
  getRepositoryUrl,
  getShowcaseRepositories,
  type GitHubRepo,
} from "@/lib/github";
import { formatCompactNumber, formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "AI Demos",
  description:
    "Demo dự án viết bằng Markdown và danh sách repo AI lấy từ GitHub.",
};

export default async function ProjectsPage() {
  const [projects, showcase] = await Promise.all([
    getAllProjects(),
    getShowcaseRepositories(),
  ]);

  const repoByName = new Map(
    showcase.repositories.map((repo) => [repo.name.toLowerCase(), repo]),
  );

  const projectRows = projects.map((project) => {
    const attachedRepo = project.repo
      ? repoByName.get(project.repo.toLowerCase())
      : undefined;

    return {
      project,
      attachedRepo,
    };
  });

  const linkedRepoNames = new Set(
    projectRows
      .map((row) => row.attachedRepo?.name.toLowerCase())
      .filter((name): name is string => Boolean(name)),
  );

  const automaticRepos = showcase.repositories.filter(
    (repo) => !linkedRepoNames.has(repo.name.toLowerCase()),
  );

  return (
    <main className="section-stack page-shell">
      <section className="section-stack">
        <h1 className="page-title">AI Demos</h1>
        <p className="page-intro">
          Trang này kết hợp demo bạn viết bằng Markdown và danh sách repo AI tự
          động lấy từ GitHub <code>{showcase.username}</code>.
        </p>
      </section>

      <section className="section-stack">
        <h2>1) Demo viết tay bằng Markdown</h2>

        {projectRows.length === 0 ? (
          <p className="empty-box">
            Chưa có demo Markdown. Thêm file vào <code>content/projects/</code>
            để hiển thị tại đây.
          </p>
        ) : (
          <div className="card-grid">
            {projectRows.map(({ project, attachedRepo }) => {
              const fallbackRepoUrl = project.repo
                ? getRepositoryUrl(showcase.username, project.repo)
                : "";

              return (
                <article className="card" key={project.slug}>
                  <p className="meta-line">{formatDate(project.date)}</p>
                  <h2>
                    <Link href={`/projects/${project.slug}`}>{project.title}</Link>
                  </h2>
                  <p>{project.summary}</p>

                  <div className="repo-stats">
                    {attachedRepo ? (
                      <>
                        <span>★ {formatCompactNumber(attachedRepo.stars)}</span>
                        <span>Forks {formatCompactNumber(attachedRepo.forks)}</span>
                        <span>{attachedRepo.language}</span>
                      </>
                    ) : null}
                  </div>

                  <div className="actions">
                    {project.repo ? (
                      <a
                        className="action-link"
                        href={attachedRepo?.url ?? fallbackRepoUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Mở repository
                      </a>
                    ) : null}

                    {project.demoUrl ? (
                      <a
                        className="action-link"
                        href={project.demoUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Mở live demo
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="section-stack">
        <h2>2) Repo AI tự động từ GitHub</h2>

        {automaticRepos.length === 0 ? (
          <p className="empty-box">
            Không tìm thấy repo AI theo bộ lọc hiện tại, hoặc GitHub API tạm
            thời không phản hồi.
          </p>
        ) : (
          <div className="card-grid">
            {automaticRepos.map((repo) => (
              <AutoRepoCard key={repo.fullName} repo={repo} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function AutoRepoCard({ repo }: { repo: GitHubRepo }) {
  return (
    <article className="card">
      <p className="meta-line">Cập nhật: {formatDate(repo.updatedAt)}</p>
      <h2>
        <a href={repo.url} rel="noreferrer" target="_blank">
          {repo.name}
        </a>
      </h2>
      <p>{repo.description || "Không có mô tả."}</p>

      <div className="repo-stats">
        <span>★ {formatCompactNumber(repo.stars)}</span>
        <span>Forks {formatCompactNumber(repo.forks)}</span>
        <span>{repo.language}</span>
      </div>

      {repo.homepage ? (
        <div className="actions">
          <a className="action-link" href={repo.homepage} rel="noreferrer" target="_blank">
            Mở homepage
          </a>
        </div>
      ) : null}
    </article>
  );
}
