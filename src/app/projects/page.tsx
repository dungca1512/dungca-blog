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
    "Demo du an viet bang Markdown va danh sach repo AI lay tu GitHub.",
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
          Trang nay ket hop demo ban viet bang Markdown va danh sach repo AI tu
          dong lay tu GitHub <code>{showcase.username}</code>.
        </p>
      </section>

      <section className="section-stack">
        <h2>1) Demo viet tay bang Markdown</h2>

        {projectRows.length === 0 ? (
          <p className="empty-box">
            Chua co demo Markdown. Them file vao <code>content/projects/</code>
            de hien thi tai day.
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
                        Mo repository
                      </a>
                    ) : null}

                    {project.demoUrl ? (
                      <a
                        className="action-link"
                        href={project.demoUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Mo live demo
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
        <h2>2) Repo AI tu dong tu GitHub</h2>

        {automaticRepos.length === 0 ? (
          <p className="empty-box">
            Khong tim thay repo AI theo bo loc hien tai, hoac GitHub API tam thoi
            khong phan hoi.
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
      <p className="meta-line">Cap nhat: {formatDate(repo.updatedAt)}</p>
      <h2>
        <a href={repo.url} rel="noreferrer" target="_blank">
          {repo.name}
        </a>
      </h2>
      <p>{repo.description || "Khong co mo ta."}</p>

      <div className="repo-stats">
        <span>★ {formatCompactNumber(repo.stars)}</span>
        <span>Forks {formatCompactNumber(repo.forks)}</span>
        <span>{repo.language}</span>
      </div>

      {repo.homepage ? (
        <div className="actions">
          <a className="action-link" href={repo.homepage} rel="noreferrer" target="_blank">
            Mo homepage
          </a>
        </div>
      ) : null}
    </article>
  );
}
