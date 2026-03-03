import Link from "next/link";

import type { PostListItem } from "@/lib/content";
import { formatDate } from "@/lib/format";

type BlogFeedMode = "home" | "blog";

type BlogFeedProps = {
  mode: BlogFeedMode;
  posts: PostListItem[];
};

type Topic = {
  name: string;
  count: number;
};

function estimateReadTime(post: PostListItem): string {
  const words = `${post.title} ${post.summary}`
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean).length;

  const minutes = Math.max(3, Math.ceil(words / 42));
  return `${minutes} phút đọc`;
}

function collectTopics(posts: PostListItem[]): Topic[] {
  const bucket = new Map<string, number>();

  for (const post of posts) {
    for (const tag of post.tags) {
      const normalized = tag.toLowerCase();
      bucket.set(normalized, (bucket.get(normalized) ?? 0) + 1);
    }
  }

  return [...bucket.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => {
      if (left.count !== right.count) {
        return right.count - left.count;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, 12);
}

type LeftMenuItem = {
  label: string;
  href: string;
  external?: boolean;
};

const LEFT_MENU: LeftMenuItem[] = [
  { label: "Trang chủ", href: "/" },
  { label: "Blog", href: "/blog" },
  { label: "AI Demos", href: "/projects" },
  { label: "Portfolio", href: "https://dungca1512.github.io/", external: true },
  { label: "GitHub", href: "https://github.com/dungca1512", external: true },
];

const STUDY_LINKS = [
  {
    label: "CS231n - Computer Vision",
    href: "https://cs231n.stanford.edu/",
  },
  {
    label: "CS224n - NLP",
    href: "https://web.stanford.edu/class/cs224n/",
  },
  {
    label: "Machine Learning Mastery",
    href: "https://machinelearningmastery.com/",
  },
] as const;

const CONNECT_LINKS = [
  {
    name: "Portfolio cá nhân",
    role: "Dự án, kinh nghiệm, hành trình nghề nghiệp",
    href: "https://dungca1512.github.io/",
  },
  {
    name: "GitHub dungca1512",
    role: "Mã nguồn và demo AI",
    href: "https://github.com/dungca1512",
  },
  {
    name: "LinkedIn",
    role: "Kết nối chuyên môn",
    href: "https://www.linkedin.com/in/dungca/",
  },
] as const;

export function BlogFeed({ mode, posts }: BlogFeedProps) {
  const highlightPosts = posts.slice(0, 4);
  const latestPosts = posts.slice(0, 12);
  const topics = collectTopics(posts);

  const title =
    mode === "home"
      ? "Blog của Dũng"
      : "Danh sách bài viết";

  const subtitle =
    mode === "home"
      ? "Nơi tổng hợp ghi chú học máy, AI engineering và kinh nghiệm triển khai thực tế."
      : "Chuỗi bài có lộ trình rõ ràng, ưu tiên kiến thức dùng được ngay.";

  return (
    <main className="feed-layout">
      <aside className="feed-left">
        <nav className="rail-card rail-menu" aria-label="Điều hướng chính">
          <p className="rail-title">Điều hướng</p>
          <ul>
            {LEFT_MENU.map((item) => (
              <li key={item.label}>
                {item.external ? (
                  <a href={item.href} rel="noreferrer" target="_blank">
                    {item.label}
                  </a>
                ) : (
                  <Link href={item.href}>{item.label}</Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <section className="rail-card">
          <p className="rail-title">Mới nhất</p>
          {latestPosts.length === 0 ? (
            <p className="rail-empty">Chưa có bài viết nào.</p>
          ) : (
            <ul className="rail-post-list">
              {latestPosts.map((post) => (
                <li key={post.slug}>
                  <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {mode === "home" ? (
          <section className="rail-card">
            <p className="rail-title">Trọng tâm hiện tại</p>
            <p className="rail-text">
              Viết bài theo hướng implementation-first: đọc là áp dụng được
              ngay vào dự án ML/AI thực tế.
            </p>
            <p className="rail-stats">{posts.length} bài viết · {topics.length} chủ đề</p>
          </section>
        ) : null}
      </aside>

      <section className="feed-center">
        <header className="feed-head">
          <p className="feed-kicker">Kho tri thức cá nhân</p>
          <h1 className="feed-title">{title}</h1>
          <p className="feed-subtitle">{subtitle}</p>
        </header>

        {mode === "home" ? (
          <article className="story-feature">
            <p className="story-feature-meta">Giới thiệu nhanh</p>
            <h2>Đơn giản, có cấu trúc, tập trung vào khả năng áp dụng thực tế</h2>
            <p>
              Mình viết theo format dễ đọc: vấn đề, ví dụ, checklist và bước
              triển khai. Mục tiêu là học nhanh, làm thật, đo được kết quả.
            </p>
            <div className="story-feature-actions">
              <Link className="story-link-pill" href="/blog">
                Đọc tất cả bài viết
              </Link>
              <a
                className="story-link-pill"
                href="https://dungca1512.github.io/"
                rel="noreferrer"
                target="_blank"
              >
                Xem portfolio
              </a>
            </div>
          </article>
        ) : null}

        {posts.length === 0 ? (
          <p className="feed-empty">
            Chưa có bài viết. Hãy thêm file Markdown vào <code>content/posts</code>.
          </p>
        ) : (
          <div className="story-list">
            {posts.map((post) => (
              <article className="story-card" key={post.slug}>
                <div className="story-main">
                  <p className="story-meta">
                    {formatDate(post.date)} · {estimateReadTime(post)}
                  </p>
                  <h2 className="story-title">
                    <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                  </h2>
                  <p className="story-summary">{post.summary}</p>
                  <div className="story-footer">
                    {post.tags.length > 0 ? (
                      <div className="story-tags">
                        {post.tags.slice(0, 3).map((tag) => (
                          <span className="story-tag" key={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <aside className="feed-right">
        <section className="rail-card">
          <p className="rail-title">Bài nên đọc</p>
          {highlightPosts.length === 0 ? (
            <p className="rail-empty">Chưa có gợi ý.</p>
          ) : (
            <div className="pick-list">
              {highlightPosts.map((post) => (
                <article className="pick-item" key={post.slug}>
                  <p className="pick-meta">{formatDate(post.date)}</p>
                  <h3>
                    <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                  </h3>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rail-card">
          <p className="rail-title">Chủ đề đề xuất</p>
          {topics.length === 0 ? (
            <p className="rail-empty">Chưa có thẻ chủ đề.</p>
          ) : (
            <div className="topic-cloud">
              {topics.map((topic) => (
                <span className="topic-pill" key={topic.name}>
                  {topic.name}
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="rail-card">
          <p className="rail-title">Tài nguyên học tập</p>
          <ul className="rail-link-list">
            {STUDY_LINKS.map((item) => (
              <li key={item.href}>
                <a href={item.href} rel="noreferrer" target="_blank">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="rail-card">
          <p className="rail-title">Kết nối</p>
          <div className="follow-list">
            {CONNECT_LINKS.map((item) => (
              <a href={item.href} key={item.href} rel="noreferrer" target="_blank">
                <strong>{item.name}</strong>
                <span>{item.role}</span>
              </a>
            ))}
          </div>
        </section>
      </aside>
    </main>
  );
}
