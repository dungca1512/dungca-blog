import type { Metadata } from "next";
import { Noto_Sans, Noto_Serif } from "next/font/google";
import Link from "next/link";

import { FloatingNavControls } from "@/components/floating-nav-controls";
import { TopSearch } from "@/components/top-search";
import { getAllPosts } from "@/lib/content";
import { PORTFOLIO_URL, SITE_NAME, SITE_URL } from "@/lib/site";

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

const siteDescription =
  "Blog của Dũng — AI/ML Systems Architect: hạ tầng AI, Kubernetes/GKE, MLOps, ML serving (ASR, TTS, chấm phát âm, embedding) và ghi chú machine learning.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: siteDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: SITE_NAME,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: siteDescription,
  },
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
                href={PORTFOLIO_URL}
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
