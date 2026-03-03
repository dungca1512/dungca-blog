import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Blog của Dũng",
    template: "%s | Blog của Dũng",
  },
  description:
    "Blog AI/ML Engineer của Dũng: hệ thống LLM production, research agent, ASR và ghi chú machine learning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <div className="topbar-left">
              <button aria-label="Mở điều hướng" className="icon-btn" type="button">
                ☰
              </button>
              <Link className="topbar-brand" href="/">
                Blog của Dũng
              </Link>
              <label className="topbar-search" htmlFor="search-blog">
                <span>⌕</span>
                <input
                  id="search-blog"
                  placeholder="Tìm kiếm ghi chú, ý tưởng và bài ML"
                  readOnly
                  type="text"
                />
              </label>
            </div>

            <div className="topbar-right">
              <Link className="topbar-link" href="/blog">
                Bài viết
              </Link>
              <a
                className="topbar-link"
                href="https://dungca1512.github.io/"
                rel="noreferrer"
                target="_blank"
              >
                Portfolio
              </a>
              <a
                className="topbar-pill"
                href="mailto:dungca1512@gmail.com"
                rel="noreferrer"
                target="_blank"
              >
                Liên hệ
              </a>
              <a
                aria-label="Hồ sơ GitHub"
                className="avatar-dot"
                href="https://github.com/dungca1512"
                rel="noreferrer"
                target="_blank"
              >
                CA
              </a>
            </div>
          </div>
        </header>

        <div className="site-shell">
          {children}
        </div>
      </body>
    </html>
  );
}
