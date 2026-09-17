import { notFound } from "next/navigation";
import { PostEditor } from "@/components/admin/post-editor";
import { adminDb, findPostById } from "@/lib/admin-posts";
export const dynamic = "force-dynamic";
export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === "moi") return <PostEditor post={null} />;
  const parsed = Number(id); if (!Number.isInteger(parsed) || parsed <= 0) notFound();
  const post = await findPostById(await adminDb(), parsed); if (!post) notFound();
  return <PostEditor post={post} />;
}
