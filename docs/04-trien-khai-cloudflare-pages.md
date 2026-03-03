# Triển khai Cloudflare Pages

## 1) Kết nối repo GitHub

1. Vào Cloudflare Pages.
2. Chọn `Create a project`.
3. Kết nối repo `dungca1512/dungca-blog`.

## 2) Cấu hình build

- Framework preset: `Next.js (Static HTML Export)` hoặc `None`
- Build command: `npm run build`
- Build output directory: `out`
- Node.js version: `20`

## 3) Environment variables (khuyến nghị)

- `GITHUB_TOKEN` (optional): tăng hạn mức gọi GitHub API khi build.

## 4) Cơ chế deploy

- Mỗi lần push lên branch đã kết nối (thường là `main`), Cloudflare tự chạy build/deploy.
- Nếu gặp lỗi tạm thời kiểu `internal error` phía Cloudflare sau bước upload file, thường chỉ cần `Retry deployment`.

## 5) Checklist khi deploy lỗi

1. Kiểm tra workflow CI trên GitHub có pass không.
2. Chạy local `npm run lint && npm run build`.
3. Kiểm tra lại build output là `out/`.
4. Retry deployment trên Cloudflare Pages.
