import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Cong Anh Dung Blog",
    template: "%s | Cong Anh Dung Blog",
  },
  description:
    "AI/ML Engineer blog by Cong Anh Dung: production LLM systems, research agents, ASR, and ML notes.",
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
              <button aria-label="Open navigation" className="icon-btn" type="button">
                ☰
              </button>
              <Link className="topbar-brand" href="/">
                Cong Anh Dung
              </Link>
              <label className="topbar-search" htmlFor="search-blog">
                <span>⌕</span>
                <input
                  id="search-blog"
                  placeholder="Search notes, ideas, and ML posts"
                  readOnly
                  type="text"
                />
              </label>
            </div>

            <div className="topbar-right">
              <a
                className="topbar-link"
                href="https://dungca1512.github.io/"
                rel="noreferrer"
                target="_blank"
              >
                Portfolio
              </a>
              <Link className="topbar-link" href="/projects">
                AI Demos
              </Link>
              <a
                className="topbar-pill"
                href="mailto:dungca1512@gmail.com"
                rel="noreferrer"
                target="_blank"
              >
                Contact
              </a>
              <a
                aria-label="GitHub profile"
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
