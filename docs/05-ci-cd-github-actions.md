# CI/CD với GitHub Actions

Repo đang dùng workflow:

- `.github/workflows/ci.yml`

## Trigger

- `push` vào `main`
- `pull_request`

## Các bước đang chạy

1. Checkout source
2. Setup Node.js 20 + cache npm
3. `npm ci`
4. `npm run lint`
5. `npm run build`

## Ý nghĩa

- Chặn code lỗi lint hoặc lỗi build trước khi merge/deploy.
- Giảm rủi ro đẩy bản hỏng lên Cloudflare Pages.

## Gợi ý mở rộng (tuỳ chọn)

1. Thêm bước kiểm tra link hỏng trong Markdown.
2. Thêm kiểm tra chính tả cho bài viết.
3. Tách job build preview cho PR nếu cần.
