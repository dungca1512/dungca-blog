import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getAllPosts, getPostBySlug, getPostSlugs } from "@/lib/content";
import { formatDate } from "@/lib/format";

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

type TocItem = {
  id: string;
  text: string;
  level: 2 | 3;
};

export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = await getPostSlugs();

  return slugs.map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: "Không tìm thấy bài viết",
    };
  }

  return {
    title: post.title,
    description: post.summary,
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const [post, allPosts] = await Promise.all([getPostBySlug(slug), getAllPosts()]);

  if (!post) {
    notFound();
  }

  const latestPosts = allPosts.filter((item) => item.slug !== post.slug).slice(0, 18);
  const relatedPosts = allPosts
    .filter((item) => item.slug !== post.slug)
    .map((item) => {
      const score = item.tags.filter((tag) => post.tags.includes(tag)).length;
      return { item, score };
    })
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }

      return Date.parse(right.item.date) - Date.parse(left.item.date);
    })
    .slice(0, 4);

  const { htmlWithIds, toc } = buildArticleHtmlAndToc(post.contentHtml);

  return (
    <main className="article-layout">
      <aside className="article-rail article-left">
        <nav className="rail-card rail-menu" aria-label="Bài viết mới">
          <p className="rail-title">Bài mới</p>
          {latestPosts.length === 0 ? (
            <p className="rail-empty">Chưa có bài viết nào.</p>
          ) : (
            <ul className="rail-post-list">
              {latestPosts.map((item) => (
                <li key={item.slug}>
                  <Link href={`/blog/${item.slug}`}>{item.title}</Link>
                </li>
              ))}
            </ul>
          )}
        </nav>
      </aside>

      <section className="article-center section-stack">
        <header className="section-stack reading-header">
          <h1 className="page-title">{post.title}</h1>
          <p className="meta-line">{formatDate(post.date)}</p>

          {post.tags.length > 0 ? (
            <ul className="tag-list">
              {post.tags.map((tag) => (
                <li className="tag" key={tag}>
                  {tag}
                </li>
              ))}
            </ul>
          ) : null}
        </header>

        {toc.length > 0 ? (
          <nav aria-label="Mục lục bài viết" className="article-toc">
            <p className="rail-title">Mục lục</p>
            <ul>
              {toc.map((entry) => (
                <li className={`toc-level-${entry.level}`} key={entry.id}>
                  <a href={`#${entry.id}`}>{entry.text}</a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <article
          className="markdown-content article-content"
          dangerouslySetInnerHTML={{ __html: htmlWithIds }}
        />
      </section>

      <aside className="article-rail article-right">
        <section className="rail-card">
          <p className="rail-title">Liên quan</p>
          {relatedPosts.length === 0 ? (
            <p className="rail-empty">Chưa có bài liên quan.</p>
          ) : (
            <div className="pick-list">
              {relatedPosts.map(({ item }) => (
                <article className="pick-item" key={item.slug}>
                  <p className="pick-meta">{formatDate(item.date)}</p>
                  <h3>
                    <Link href={`/blog/${item.slug}`}>{item.title}</Link>
                  </h3>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rail-card">
          <p className="rail-title">Liên kết nhanh</p>
          <ul className="rail-link-list">
            <li>
              <Link href="/blog">Tất cả bài viết</Link>
            </li>
            <li>
              <Link href="/projects">AI Demos</Link>
            </li>
            <li>
              <a href="https://dungca1512.github.io/" rel="noreferrer" target="_blank">
                Portfolio
              </a>
            </li>
            <li>
              <a href="https://github.com/dungca1512" rel="noreferrer" target="_blank">
                GitHub
              </a>
            </li>
          </ul>
        </section>
      </aside>
    </main>
  );
}

function buildArticleHtmlAndToc(contentHtml: string): {
  htmlWithIds: string;
  toc: TocItem[];
} {
  const toc: TocItem[] = [];
  const used = new Map<string, number>();

  const htmlWithIds = contentHtml.replace(
    /<h([2-3])>([\s\S]*?)<\/h\1>/g,
    (headingSource, levelValue, titleHtml) => {
      const level = Number(levelValue) as 2 | 3;
      const text = stripHtml(titleHtml).trim();
      if (!text) {
        return headingSource;
      }

      const baseId = toSlug(text) || `muc-${toc.length + 1}`;
      const count = (used.get(baseId) ?? 0) + 1;
      used.set(baseId, count);
      const id = count === 1 ? baseId : `${baseId}-${count}`;

      toc.push({ id, text, level });

      return `<h${level} id="${id}" class="article-heading">${titleHtml}</h${level}>`;
    },
  );

  return {
    htmlWithIds,
    toc,
  };
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ");
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
