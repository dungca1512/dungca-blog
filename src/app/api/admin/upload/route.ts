import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { ALLOWED_MEDIA_TYPES, MAX_UPLOAD_BYTES, mediaObjectKey } from "@/lib/media";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await requireSession(request))) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { env } = await getCloudflareContext({ async: true });

  const mediaBase = (env as unknown as Record<string, string>).MEDIA_BASE_URL;
  if (!mediaBase) {
    /* Không có tên miền công khai thì upload thành công cũng vô dụng: ta có
     * object trong bucket mà không có URL để chèn vào bài. Từ chối sớm còn
     * hơn để ảnh nằm mồ côi trong R2. */
    return NextResponse.json(
      { error: "Chưa cấu hình MEDIA_BASE_URL cho bucket ảnh." },
      { status: 500 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Body không phải multipart form." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Thiếu trường file." }, { status: 400 });
  }

  if (!ALLOWED_MEDIA_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Không nhận kiểu file ${file.type || "không rõ"}.` },
      { status: 400 },
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File ${(file.size / 1024 / 1024).toFixed(1)} MB, tối đa 5 MB.` },
      { status: 413 },
    );
  }

  const key = mediaObjectKey(file.name);

  await env.BLOG_MEDIA.put(key, file.stream(), {
    httpMetadata: {
      /* Dùng file.type đã qua danh sách cho phép ở trên, KHÔNG dùng thẳng
       * chuỗi client gửi. Nếu không, một file .html gắn nhãn image/png vẫn
       * được R2 trả về với Content-Type do client chọn. */
      contentType: file.type,
      /* Ảnh có tên duy nhất nên không bao giờ thay đổi nội dung — cache vĩnh
       * viễn là an toàn và miễn phí. */
      cacheControl: "public, max-age=31536000, immutable",
    },
  });

  return NextResponse.json(
    { url: `${mediaBase.replace(/\/$/, "")}/${key}` },
    { status: 201 },
  );
}
