import type { Metadata } from "next";
import Link from "next/link";

import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Quản trị",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <Link className="admin-brand" href="/admin">
          {SITE_NAME} · quản trị
        </Link>
        <nav className="admin-nav">
          <Link href="/">Xem blog</Link>
          {/* Logout là POST: GET có thể bị kích hoạt bởi prefetch hoặc thẻ ảnh. */}
          <form action="/api/auth/logout" method="post">
            <button className="admin-link-btn" type="submit">
              Đăng xuất
            </button>
          </form>
        </nav>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
