# Tài liệu vận hành blog

Bộ tài liệu này tách riêng phần hướng dẫn triển khai và sử dụng blog Markdown.

## Danh mục

1. [01-cài đặt và chạy local](./01-cai-dat-va-chay-local.md)
2. [02-viết bài blog bằng Markdown](./02-viet-bai-blog-markdown.md)
3. [03-chèn ảnh trong bài viết](./03-chen-anh-trong-bai-viet.md)
4. [04-triển khai Cloudflare Pages](./04-trien-khai-cloudflare-pages.md)
5. [05-CI/CD với GitHub Actions](./05-ci-cd-github-actions.md)

## Luồng làm việc nhanh

1. Viết bài mới trong `content/posts/`.
2. Chạy kiểm tra local (`npm run lint`, `npm run build`).
3. Commit và push lên `main`.
4. Cloudflare Pages tự build và publish bản mới.
