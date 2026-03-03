---
title: "Khoi tao blog Markdown tren Next.js"
summary: "Bo khung blog da san sang: them file .md la co bai viet moi."
date: "2026-03-03"
tags:
  - nextjs
  - markdown
  - cloudflare-pages
---

## Muc tieu

Project nay duoc to chuc de ban co the:

- Viet bai bang Markdown trong `content/posts/`.
- Tu dong tao trang danh sach bai viet (`/blog`).
- Tu dong tao trang chi tiet bai viet (`/blog/[slug]`).

## Cach tao bai viet moi

1. Tao file moi trong `content/posts`, vi du `2026-03-04-bai-moi.md`.
2. Them frontmatter (`title`, `summary`, `date`, `tags`).
3. Push len GitHub, Cloudflare Pages se build va publish ban moi.

## Ghi chu

Neu ban muon an bai viet trong qua trinh soan thao, dat:

```yaml
draft: true
```

trong frontmatter.
