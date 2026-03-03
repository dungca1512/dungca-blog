# dungca-blog

Bộ khung blog sử dụng Next.js (App Router) để:

- Viết bài bằng Markdown trong `content/posts/`
- Viết trang demo dự án trong `content/projects/`
- Tự động hiển thị repo AI trên GitHub `dungca1512`
- Build static (`output: "export"`) để deploy lên Cloudflare Pages

## 1) Chạy local

```bash
npm install
npm run dev
```

## Tài liệu chi tiết

Tài liệu tách riêng trong thư mục [docs](./docs/README.md):

- Cài đặt/chạy local
- Viết bài Markdown
- Chèn ảnh trong bài viết
- Triển khai Cloudflare Pages
- CI/CD với GitHub Actions

## 2) Cấu trúc thư mục nội dung

```text
content/
  posts/
    2026-03-03-khoi-tao-blog.md
    _template.md
  projects/
    2026-03-03-demo-ai-local.md
    _template.md
    featured-repos.json
```

## 3) Viết bài blog Markdown

1. Tạo file mới trong `content/posts/` với tên dạng `slug.md`.
2. Khai báo frontmatter:

```yaml
---
title: "Tiêu đề"
summary: "Mô tả ngắn"
date: "2026-03-03"
tags:
  - nextjs
  - markdown
---
```

3. Viết nội dung Markdown bên dưới.
4. Trang sẽ xuất hiện tại:
   - Danh sách: `/blog`
   - Chi tiết: `/blog/[slug]`

Nếu chưa muốn publish, thêm `draft: true`.

## 4) Upload ảnh vào bài viết

1. Tạo thư mục ảnh theo slug bài viết, ví dụ:
   `public/images/posts/2026-03-03-khoi-tao-blog/`
2. Đặt ảnh vào thư mục đó.
3. Chèn trong Markdown:

```md
![Mô tả ảnh](/images/posts/2026-03-03-khoi-tao-blog/anh-minh-hoa.png)
```

Ảnh sẽ được build cùng site và hoạt động trực tiếp trên Cloudflare Pages.

## 5) Demo AI repos từ GitHub

- Trang `/projects` gồm:
  - Demo viết tay bằng Markdown (`content/projects/*.md`)
  - Repo AI tự động lấy từ GitHub

- File `content/projects/featured-repos.json`:

```json
{
  "githubUser": "dungca1512",
  "featured": ["ten-repo-uu-tien"]
}
```

`featured` là danh sách repo muốn ép hiển thị (kể cả khi tên/mô tả không match bộ lọc AI).

## 6) Deploy Cloudflare Pages (Git integration)

Kết nối repo GitHub với Cloudflare Pages, sau đó dùng:

- Framework preset: `Next.js (Static HTML Export)` hoặc `None`
- Build command: `npm run build`
- Build output directory: `out`
- Node.js version: `20`

Mỗi lần push lên nhánh đã kết nối, Cloudflare sẽ tự build và deploy.

## 7) Biến môi trường khuyến nghị

- `GITHUB_TOKEN` (optional): tăng hạn mức gọi GitHub API khi build.

Không có token vẫn build được, nhưng có thể bị giới hạn request nếu deploy nhiều lần liên tiếp.
