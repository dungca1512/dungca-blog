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
        <div className="site-shell">
          <header className="site-header">
            <div className="brand-wrap">
              <Link className="brand" href="/">
                Cong Anh Dung
              </Link>
              <p className="brand-subtitle">AI/ML Engineer - Hanoi, Vietnam</p>
            </div>

            <nav className="site-nav">
              <Link className="nav-link" href="/blog">
                Blog
              </Link>
              <Link className="nav-link" href="/projects">
                AI Demos
              </Link>
              <a
                className="nav-link"
                href="https://github.com/dungca1512"
                rel="noreferrer"
                target="_blank"
              >
                GitHub
              </a>
            </nav>
          </header>

          {children}
        </div>
      </body>
    </html>
  );
}
