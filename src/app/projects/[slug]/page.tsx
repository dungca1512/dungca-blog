import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getFeaturedReposConfig,
  getProjectBySlug,
  getProjectSlugs,
} from "@/lib/content";
import { getRepositoryUrl } from "@/lib/github";
import { formatDate } from "@/lib/format";

type ProjectPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = await getProjectSlugs();

  return slugs.map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) {
    return {
      title: "Khong tim thay demo",
    };
  }

  return {
    title: project.title,
    description: project.summary,
  };
}

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const [project, config] = await Promise.all([
    getProjectBySlug(slug),
    getFeaturedReposConfig(),
  ]);

  if (!project) {
    notFound();
  }

  const repoUrl = project.repo
    ? getRepositoryUrl(config.githubUser, project.repo)
    : "";

  return (
    <main className="section-stack reading-main">
      <Link className="back-link" href="/projects">
        Quay lai trang AI demos
      </Link>

      <header className="section-stack reading-header">
        <h1 className="page-title">{project.title}</h1>
        <p className="meta-line">{formatDate(project.date)}</p>

        {project.tags.length > 0 ? (
          <ul className="tag-list">
            {project.tags.map((tag) => (
              <li className="tag" key={tag}>
                {tag}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="actions">
          {project.repo ? (
            <a className="action-link" href={repoUrl} rel="noreferrer" target="_blank">
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
      </header>

      <article
        className="markdown-content"
        dangerouslySetInnerHTML={{ __html: project.contentHtml }}
      />
    </main>
  );
}
