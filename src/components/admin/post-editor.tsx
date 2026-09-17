"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { AdminPostRow } from "@/lib/admin-posts";
import { markdownToHtml } from "@/lib/markdown";

type Props = { post: AdminPostRow | null };
type Tab = "soan" | "xem";
const nhapKey = (id: number | "moi") => `nhap-bai-${id}`;

export function PostEditor({ post }: Props) {
  const router = useRouter();
  const id = post?.id ?? "moi";
  const [title, setTitle] = useState(post?.title ?? "");
  const [summary, setSummary] = useState(post?.summary ?? "");
  const [tags, setTags] = useState((post?.tags ?? []).join(", "));
  const [body, setBody] = useState(post?.bodyMarkdown ?? "");
  const [tab, setTab] = useState<Tab>("soan");
  const [preview, setPreview] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(nhapKey(id));
      if (!saved) return;
      const parsed = JSON.parse(saved) as Partial<Record<"title" | "summary" | "tags" | "body", string>>;
      if (parsed.body !== undefined && parsed.body !== (post?.bodyMarkdown ?? "")) {
        setTitle(parsed.title ?? ""); setSummary(parsed.summary ?? ""); setTags(parsed.tags ?? ""); setBody(parsed.body);
        setStatus("Đã khôi phục bản nháp chưa lưu trên máy này.");
      }
    } catch { /* localStorage có thể bị chặn trong chế độ riêng tư. */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try { localStorage.setItem(nhapKey(id), JSON.stringify({ title, summary, tags, body })); } catch { /* bỏ qua quota */ }
  }, [id, title, summary, tags, body]);

  useEffect(() => {
    if (tab !== "xem") return;
    let cancelled = false;
    markdownToHtml(body).then((html) => { if (!cancelled) setPreview(html); });
    return () => { cancelled = true; };
  }, [tab, body]);

  const input = () => ({ title: title.trim(), summary, tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean), bodyMarkdown: body });
  async function luuNhap(): Promise<number | null> {
    if (!title.trim()) { setStatus("Bài viết phải có tiêu đề."); return null; }
    setSaving(true); setStatus("Đang lưu…");
    const response = await fetch(post ? `/api/admin/posts/${post.id}` : "/api/admin/posts", {
      method: post ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input()),
    });
    setSaving(false);
    if (!response.ok) { setStatus(`Lưu thất bại (${response.status}).`); return null; }
    const { post: saved } = await response.json() as { post: AdminPostRow };
    try { localStorage.removeItem(nhapKey(id)); } catch { /* không quan trọng */ }
    setStatus("Đã lưu nháp.");
    if (!post) router.replace(`/admin/posts/${saved.id}`); else router.refresh();
    return saved.id;
  }
  async function dangBai() {
    const savedId = await luuNhap(); if (!savedId) return;
    setSaving(true); const response = await fetch(`/api/admin/posts/${savedId}/publish`, { method: "POST" }); setSaving(false);
    setStatus(response.ok ? "Đã đăng." : `Đăng thất bại (${response.status}).`); router.refresh();
  }
  async function goVeNhap() {
    if (!post) return; setSaving(true);
    const response = await fetch(`/api/admin/posts/${post.id}/publish`, { method: "DELETE" }); setSaving(false);
    setStatus(response.ok ? "Đã gỡ về nháp." : `Gỡ thất bại (${response.status}).`); router.refresh();
  }
  function chenTaiConTro(text: string) {
    const el = bodyRef.current; if (!el) return setBody((value) => value + text);
    const { selectionStart: start, selectionEnd: end } = el;
    setBody((value) => value.slice(0, start) + text + value.slice(end));
    requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = start + text.length; });
  }
  void chenTaiConTro;
  return <div className="editor">
    <div className="editor-fields">
      <label className="editor-label">Tiêu đề<input className="editor-input" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label className="editor-label">Tóm tắt<input className="editor-input" value={summary} onChange={(e) => setSummary(e.target.value)} /></label>
      <label className="editor-label">Thẻ<input className="editor-input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="cách nhau bằng dấu phẩy" /></label>
    </div>
    <div className="editor-tabs" role="tablist">
      <button role="tab" aria-selected={tab === "soan"} className={tab === "soan" ? "editor-tab editor-tab-active" : "editor-tab"} onClick={() => setTab("soan")} type="button">Soạn</button>
      <button role="tab" aria-selected={tab === "xem"} className={tab === "xem" ? "editor-tab editor-tab-active" : "editor-tab"} onClick={() => setTab("xem")} type="button">Xem trước</button>
    </div>
    {tab === "soan" ? (
      <textarea ref={bodyRef} className="editor-body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Viết bằng Markdown…" />
    ) : <div className="editor-preview article-body" dangerouslySetInnerHTML={{ __html: preview }} />}
    <div className="editor-actions">
      <button className="admin-btn" disabled={saving} onClick={luuNhap} type="button">Lưu nháp</button>
      <button className="admin-btn admin-btn-primary" disabled={saving} onClick={dangBai} type="button">Đăng bài</button>
      {post?.status === "published" && <button className="admin-btn" disabled={saving} onClick={goVeNhap} type="button">Gỡ về nháp</button>}
      <span className="editor-status" role="status">{status}</span>
    </div>
  </div>;
}
