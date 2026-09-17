import Link from "next/link";

import { adminDb, listAllPosts } from "@/lib/admin-posts";

export const dynamic = "force-dynamic";

function ngayGon(value: string | null): string {
  return value ? value.slice(0, 10) : "—";
}

export default async function AdminHomePage() {
  const posts = await listAllPosts(await adminDb());

  return (
    <>
      <div className="admin-page-head">
        <h1>Bài viết</h1>
        <Link className="admin-btn admin-btn-primary" href="/admin/posts/moi">
          Viết bài mới
        </Link>
      </div>
      {posts.length === 0 ? (
        <p className="admin-empty">Chưa có bài nào. Bấm “Viết bài mới” để bắt đầu.</p>
      ) : (
        <ul className="admin-post-list">
          {posts.map((post) => (
            <li key={post.id} className="admin-post-item">
              <Link className="admin-post-title" href={`/admin/posts/${post.id}`}>
                {post.title}
              </Link>
              <span
                className={
                  post.status === "published"
                    ? "admin-badge admin-badge-published"
                    : "admin-badge admin-badge-draft"
                }
              >
                {post.status === "published" ? "Đã đăng" : "Nháp"}
              </span>
              <span className="admin-post-meta">
                Sửa {ngayGon(post.updatedAt)} · Đăng {ngayGon(post.publishedAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
