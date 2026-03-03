# Viết bài blog bằng Markdown

## 1) Tạo file bài viết

Tạo file mới trong `content/posts/`.

Quy ước tên file:

```text
YYYY-MM-DD-slug-bai-viet.md
```

Ví dụ:

```text
content/posts/2026-03-10-ml-co-ban-05-linear-regression.md
```

## 2) Khai báo frontmatter

```yaml
---
title: "ML cơ bản #5: Linear Regression"
summary: "Giải thích trực quan và cách train baseline tuyến tính."
date: "2026-03-10"
tags:
  - ml-basics
  - linear-regression
draft: false
---
```

## 3) Viết nội dung

Viết nội dung Markdown bên dưới frontmatter:

```md
## Mục tiêu

Bài này giúp bạn...
```

## 4) Quy tắc publish

- `draft: true`: ẩn khỏi trang `/blog`.
- `draft: false` hoặc bỏ dòng `draft`: bài sẽ hiển thị.

## 5) URL sau khi build

- Danh sách bài: `/blog`
- Bài chi tiết: `/blog/<slug>`

`<slug>` chính là tên file không có `.md`.
