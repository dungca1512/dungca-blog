# dungca-blog

- Blog: <https://blog-dungca.ai-innovation-homelab.org>
- Portfolio: <https://portfolio-dungca.ai-innovation-homelab.org>

Blog Next.js (App Router) chạy trên **Cloudflare Workers** qua OpenNext.

| Thứ | Nằm ở đâu | Sửa bằng cách nào |
|---|---|---|
| Bài viết | D1 (`posts`) | Soạn thẳng trên web tại `/admin` |
| Ảnh trong bài | R2 (`blog-media`) | Nút upload trong trình soạn thảo |
| Trang dự án | `content/projects/*.md` | Sửa file, commit, push |
| Giao diện, logic | `src/` | Sửa file, commit, push |

Hai luồng khác nhau, đừng lẫn: **bài viết không nằm trong git**. Viết bài
không cần commit; đổi code thì phải.

`content/posts/` còn trong repo chỉ để làm nguồn cho `scripts/migrate-posts.mjs`
(lần chuyển dữ liệu sang D1). Thêm file vào đó **không** tạo bài mới.

## Đăng bài

1. Mở <https://blog-dungca.ai-innovation-homelab.org/admin>
2. Đăng nhập bằng GitHub (chỉ tài khoản khai ở `ADMIN_GITHUB_LOGIN` vào được)
3. Soạn Markdown, xem trước, upload ảnh, lưu nháp
4. Bấm **Đăng bài**

Chi tiết: [docs/02](./docs/02-viet-bai-blog-markdown.md).

## Chạy local

```bash
npm install
npm run dev          # http://localhost:3000
```

Bản chạy trên runtime Workers thật (sát production hơn):

```bash
npm run cf:preview   # http://localhost:8788
```

Chi tiết: [docs/01](./docs/01-cai-dat-va-chay-local.md).

## Trước khi push code

```bash
npm run verify       # lint → typecheck → test → check:colors → build
```

Push lên `main` là deploy thật, không có bước duyệt. Xem
[docs/05](./docs/05-ci-cd-github-actions.md).

## Cấu trúc

```text
src/
  app/            # route App Router; app/admin và app/api/admin là khu quản trị
  lib/            # posts (D1), auth/session, media (R2), markdown, article-toc
  components/     # giao diện, gồm cả trình soạn thảo admin
content/projects/ # trang dự án, vẫn viết bằng Markdown trong repo
migrations/       # migration D1, CHỈ ĐƯỢC CỘNG THÊM (xem docs/04)
scripts/          # smoke, build index dự án, cổng màu, migrate bài
tests/            # vitest: tests/*.test.ts chạy Node, tests/workers/* chạy workerd
```

## Domain và cấu hình

`SITE_URL` khai một chỗ duy nhất tại [src/lib/site.ts](./src/lib/site.ts), dùng lại cho
`metadataBase`, canonical, Open Graph, `sitemap.xml`, `robots.txt`.

Binding, route, D1, R2: [wrangler.jsonc](./wrangler.jsonc) — file đó có chú thích
lý do cho từng lựa chọn, đọc trước khi sửa.

## Tài liệu

Xem [docs/](./docs/README.md).
