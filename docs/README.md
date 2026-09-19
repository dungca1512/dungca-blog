# Tài liệu vận hành blog

## Danh mục

1. [01 — Cài đặt và chạy local](./01-cai-dat-va-chay-local.md)
2. [02 — Viết và đăng bài](./02-viet-bai-blog-markdown.md)
3. [03 — Chèn ảnh trong bài viết](./03-chen-anh-trong-bai-viet.md)
4. [04 — Triển khai Cloudflare Workers](./04-trien-khai-cloudflare-workers.md)
5. [05 — CI/CD với GitHub Actions](./05-ci-cd-github-actions.md)

Ngoài ra: [superpowers/](./superpowers/) giữ bản bàn giao của hai kế hoạch đã
làm (A: chuyển sang Workers + D1, B: khu admin). Đọc khi cần biết *vì sao* một
quyết định được chọn, không phải khi cần biết *cách làm*.

## Hai luồng, đừng lẫn

**Đăng bài** — không đụng tới git:

1. Mở `/admin`, đăng nhập GitHub.
2. Soạn Markdown, upload ảnh, lưu nháp.
3. Bấm "Đăng bài". Bài lên mạng ngay.

**Đổi code hoặc trang dự án** — đi qua git:

1. Sửa trong `src/` (hoặc `content/projects/`).
2. `npm run verify`.
3. Commit, push lên `main`.
4. GitHub Actions tự migrate D1 → build → deploy → smoke test.

## Khi có sự cố

| Triệu chứng | Xem |
|---|---|
| Không vào được `/admin` | [04 — mục Secret](./04-trien-khai-cloudflare-workers.md#secret) |
| Upload ảnh báo lỗi | [03](./03-chen-anh-trong-bai-viet.md) |
| Deploy đỏ | [05](./05-ci-cd-github-actions.md) |
| Bài đăng rồi mà trang trả 404 | [04 — mục "Cache và bài mới đăng"](./04-trien-khai-cloudflare-workers.md) |
| Cần lùi về bản trước | [04 — mục Rollback](./04-trien-khai-cloudflare-workers.md#rollback) |
