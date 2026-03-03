import type { Metadata } from "next";
import { Noto_Sans, Noto_Serif } from "next/font/google";
import Link from "next/link";

import { FloatingNavControls } from "@/components/floating-nav-controls";
import { TopSearch } from "@/components/top-search";
import { getAllPosts } from "@/lib/content";

import "./globals.css";

const fontUi = Noto_Sans({
  subsets: ["latin", "vietnamese"],
  variable: "--font-ui-family",
  display: "swap",
});

const fontSerif = Noto_Serif({
  subsets: ["latin", "vietnamese"],
  variable: "--font-serif-family",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Blog của Dũng",
    template: "%s | Blog của Dũng",
  },
  description:
    "Blog AI/ML Engineer của Dũng: hệ thống LLM production, research agent, ASR và ghi chú machine learning.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const posts = await getAllPosts();

  return (
    <html lang="vi">
      <body className={`${fontUi.variable} ${fontSerif.variable}`}>
        <header className="topbar">
          <div className="topbar-inner">
            <div className="topbar-left">
              <button aria-label="Mở điều hướng" className="icon-btn" type="button">
                ☰
              </button>
              <Link className="topbar-brand" href="/">
                Blog của Dũng
              </Link>
              <TopSearch posts={posts} />
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
        <FloatingNavControls />
      </body>
    </html>
  );
}
