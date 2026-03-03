---
title: "Khởi tạo blog Markdown trên Next.js"
summary: "Bộ khung blog đã sẵn sàng: thêm file .md là có bài viết mới."
date: "2026-03-03"
tags:
  - nextjs
  - markdown
  - cloudflare-pages
---

## Mục tiêu

Project này được tổ chức để bạn có thể:

- Viết bài bằng Markdown trong `content/posts/`.
- Tự động tạo trang danh sách bài viết (`/blog`).
- Tự động tạo trang chi tiết bài viết (`/blog/[slug]`).

## Cách tạo bài viết mới

1. Tạo file mới trong `content/posts`, ví dụ `2026-03-04-bai-moi.md`.
2. Thêm frontmatter (`title`, `summary`, `date`, `tags`).
3. Push lên GitHub, Cloudflare Pages sẽ build và publish bản mới.

## Chèn ảnh vào bài viết

1. Đặt ảnh vào thư mục `public/images/posts/<slug-bai-viet>/`.
2. Chèn ảnh trong Markdown:

```md
![Mô tả ảnh](/images/posts/2026-03-03-khoi-tao-blog/anh-minh-hoa.png)
```

## Ghi chú

Nếu bạn muốn ẩn bài viết trong quá trình soạn thảo, đặt:

```yaml
draft: true
```

trong frontmatter.
