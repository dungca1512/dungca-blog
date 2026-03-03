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
  { label: "Portfolio", href: "https://dungca1512.github.io/", external: true },
  { label: "GitHub", href: "https://github.com/dungca1512", external: true },
];

const WHO_TO_FOLLOW = [
  {
    name: "Công Anh Dũng",
    role: "AI/ML Engineer",
    href: "https://www.linkedin.com/in/dungca/",
  },
  {
    name: "dungca1512",
    role: "GitHub cá nhân",
    href: "https://github.com/dungca1512",
  },
  {
    name: "Portfolio",
    role: "Kinh nghiệm và dự án nổi bật",
    href: "https://dungca1512.github.io/",
  },
] as const;

export function BlogFeed({ mode, posts }: BlogFeedProps) {
  const highlightPosts = posts.slice(0, 3);
  const latestPosts = posts.slice(0, 12);
  const topics = collectTopics(posts);

  const title =
    mode === "home"
      ? "Dành cho bạn"
      : "Bài viết mới về ML cơ bản và AI Engineering";

  const subtitle =
    mode === "home"
      ? "Luồng bài viết thực chiến của Dũng: từ nền tảng machine learning đến triển khai hệ thống AI."
      : "Chuỗi ghi chú có cấu trúc, đi từ kiến thức nền tảng đến production.";

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
          <div className="feed-tabs" aria-hidden>
            <span className="feed-tab feed-tab-active">Dành cho bạn</span>
            <span className="feed-tab">Nổi bật</span>
          </div>
          <h1 className="feed-title">{title}</h1>
          <p className="feed-subtitle">{subtitle}</p>
        </header>

        {mode === "home" ? (
          <article className="story-feature">
            <p className="story-feature-meta">Chào mừng đến blog của mình</p>
            <h2>Ghi chú Machine Learning và AI Engineering để áp dụng ngay</h2>
            <p>
              Đây là nơi mình tổng hợp kiến thức từ ML cơ bản đến các bài học
              triển khai hệ thống AI thực tế. Toàn bộ trang này ưu tiên bài
              viết blog để bạn đọc nhanh và học theo lộ trình rõ ràng.
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
            {posts.map((post, index) => (
              <article className="story-card" key={post.slug}>
                <div className="story-main">
                  <p className="story-meta">Trong Blog của Dũng · {formatDate(post.date)}</p>
                  <h2 className="story-title">
                    <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                  </h2>
                  <p className="story-summary">{post.summary}</p>
                  <div className="story-footer">
                    <span>{estimateReadTime(post)}</span>
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

                <Link className={`story-thumb thumb-${index % 6}`} href={`/blog/${post.slug}`}>
                  <span>{(post.tags[0] ?? "ml").slice(0, 12)}</span>
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <aside className="feed-right">
        <section className="rail-card">
          <p className="rail-title">Gợi ý nổi bật</p>
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
          <p className="rail-title">Nên theo dõi</p>
          <div className="follow-list">
            {WHO_TO_FOLLOW.map((item) => (
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
