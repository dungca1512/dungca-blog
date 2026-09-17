import { toSlug } from "@/lib/article-toc";

/* Giới hạn 5 MB. Ảnh chụp màn hình và ảnh minh hoạ blog không vượt quá mức
 * này; vượt là dấu hiệu ảnh chưa nén, hoặc là ai đó đang dùng bucket làm nơi
 * chứa file. R2 tính tiền theo dung lượng lưu. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/* Danh sách cho phép, không phải danh sách cấm: kiểu file mới xuất hiện thì
 * mặc định bị từ chối chứ không mặc định được nhận. */
export const ALLOWED_MEDIA_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

export function mediaObjectKey(originalName: string, now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  /* basename: cắt mọi thành phần đường dẫn. Tên file đến từ client, và
   * "../../x.png" không được phép trèo ra ngoài tiền tố năm/tháng. */
  const base = originalName.split(/[/\\]/).pop() ?? "";
  const dotAt = base.lastIndexOf(".");

  const rawExt = dotAt > 0 ? base.slice(dotAt + 1).toLowerCase() : "";
  const ext = /^[a-z0-9]{1,8}$/.test(rawExt) ? rawExt : "bin";

  const stem = toSlug(dotAt > 0 ? base.slice(0, dotAt) : base) || "anh";

  /* Hậu tố ngẫu nhiên là thứ bảo đảm không trùng. Hai lần upload cùng một tên
   * file mà trùng key là ghi đè ảnh của bài cũ — mất dữ liệu trong im lặng. */
  const unique = crypto.randomUUID().replace(/-/g, "").slice(0, 10);

  return `${year}/${month}/${stem}-${unique}.${ext}`;
}
