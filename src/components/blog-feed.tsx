import Link from "next/link";

import type { PostListItem } from "@/lib/content";
import { formatDate } from "@/lib/format";

type BlogFeedMode = "home" | "blog";

type BlogFeedProps = {
  mode: BlogFeedMode;
  posts: PostListItem[];
  projectCount?: number;
  repoCount?: number;
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
  return `${minutes} min read`;
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
  { label: "Home", href: "/" },
  { label: "Stories", href: "/blog" },
  { label: "AI Demos", href: "/projects" },
  { label: "Portfolio", href: "https://dungca1512.github.io/", external: true },
  { label: "GitHub", href: "https://github.com/dungca1512", external: true },
];

const WHO_TO_FOLLOW = [
  {
    name: "Cong Anh Dung",
    role: "AI/ML Engineer",
    href: "https://www.linkedin.com/in/dungca/",
  },
  {
    name: "dungca1512",
    role: "GitHub profile",
    href: "https://github.com/dungca1512",
  },
  {
    name: "AI Gateway",
    role: "Flagship infra project",
    href: "https://github.com/dungca1512/ai-gateway",
  },
] as const;

export function BlogFeed({
  mode,
  posts,
  projectCount = 0,
  repoCount = 0,
}: BlogFeedProps) {
  const highlightPosts = posts.slice(0, 3);
  const latestPosts = posts.slice(0, 12);
  const topics = collectTopics(posts);

  const title =
    mode === "home"
      ? "For you"
      : "Latest notes on ML fundamentals and AI systems";

  const subtitle =
    mode === "home"
      ? "A practical feed from Cong Anh Dung: machine learning basics, production AI patterns, and experiments."
      : "Structured notes from fundamentals to production engineering.";

  return (
    <main className="feed-layout">
      <aside className="feed-left">
        <nav className="rail-card rail-menu" aria-label="Primary">
          <p className="rail-title">Navigation</p>
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
          <p className="rail-title">Latest</p>
          {latestPosts.length === 0 ? (
            <p className="rail-empty">No post yet.</p>
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
            <p className="rail-title">Current focus</p>
            <p className="rail-text">
              Building resilient LLM systems with clear reliability controls,
              plus ML notes written from implementation experience.
            </p>
            <p className="rail-stats">
              {posts.length} posts · {projectCount} demos · {repoCount} repos
            </p>
          </section>
        ) : null}
      </aside>

      <section className="feed-center">
        <header className="feed-head">
          <div className="feed-tabs" aria-hidden>
            <span className="feed-tab feed-tab-active">For you</span>
            <span className="feed-tab">Featured</span>
          </div>
          <h1 className="feed-title">{title}</h1>
          <p className="feed-subtitle">{subtitle}</p>
        </header>

        {mode === "home" ? (
          <article className="story-feature">
            <p className="story-feature-meta">From portfolio · dungca1512.github.io</p>
            <h2>AI/ML Engineer focused on systems that actually ship</h2>
            <p>
              I work on multi-provider LLM gateways, research-agent workflows,
              ASR fine-tuning, and data platforms. This blog is where I break
              down both fundamentals and production lessons.
            </p>
            <div className="story-feature-actions">
              <Link className="story-link-pill" href="/blog">
                Read all posts
              </Link>
              <Link className="story-link-pill" href="/projects">
                Explore AI demos
              </Link>
            </div>
          </article>
        ) : null}

        {posts.length === 0 ? (
          <p className="feed-empty">No posts yet. Add markdown files in content/posts.</p>
        ) : (
          <div className="story-list">
            {posts.map((post, index) => (
              <article className="story-card" key={post.slug}>
                <div className="story-main">
                  <p className="story-meta">In Cong Anh Dung Blog · {formatDate(post.date)}</p>
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
          <p className="rail-title">Staff Picks</p>
          {highlightPosts.length === 0 ? (
            <p className="rail-empty">No picks yet.</p>
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
          <p className="rail-title">Recommended topics</p>
          {topics.length === 0 ? (
            <p className="rail-empty">No tags available.</p>
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
          <p className="rail-title">Who to follow</p>
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
