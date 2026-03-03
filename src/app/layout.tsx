import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Dungca Blog",
    template: "%s | Dungca Blog",
  },
  description:
    "Blog viet bang Markdown va trang demo cac du an AI tu GitHub dungca1512.",
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
            <Link className="brand" href="/">
              Dungca Blog
            </Link>

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
