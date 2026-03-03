# dungca-blog

Bo khung blog su dung Next.js (App Router) de:

- Viet bai bang Markdown trong `content/posts/`
- Viet trang demo du an trong `content/projects/`
- Tu dong hien thi repo AI tren GitHub `dungca1512`
- Build static (`output: "export"`) de deploy len Cloudflare Pages

## 1) Chay local

```bash
npm install
npm run dev
```

## 2) Cau truc thu muc noi dung

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

## 3) Viet bai blog Markdown

1. Tao file moi trong `content/posts/` voi ten dang `slug.md`.
2. Khai bao frontmatter:

```yaml
---
title: "Tieu de"
summary: "Mo ta ngan"
date: "2026-03-03"
tags:
  - nextjs
  - markdown
---
```

3. Viet noi dung Markdown ben duoi.
4. Trang se xuat hien tai:
   - Danh sach: `/blog`
   - Chi tiet: `/blog/[slug]`

Neu chua muon publish, them `draft: true`.

## 4) Demo AI repos tu GitHub

- Trang `/projects` gom:
  - Demo viet tay bang Markdown (`content/projects/*.md`)
  - Repo AI tu dong lay tu GitHub

- File `content/projects/featured-repos.json`:

```json
{
  "githubUser": "dungca1512",
  "featured": ["ten-repo-uu-tien"]
}
```

`featured` la danh sach repo muon ep hien thi (ke ca khi ten/mo ta khong match bo loc AI).

## 5) Deploy Cloudflare Pages (Git integration)

Ket noi repo GitHub voi Cloudflare Pages, sau do dung:

- Framework preset: `Next.js (Static HTML Export)` hoac `None`
- Build command: `npm run build`
- Build output directory: `out`
- Node.js version: `20`

Moi lan push len nhanh da ket noi, Cloudflare se tu build va deploy.

## 6) Bien moi truong khuyen nghi

- `GITHUB_TOKEN` (optional): tang han muc goi GitHub API khi build.

Khong co token van build duoc, nhung co the bi gioi han request neu deploy nhieu lan lien tiep.
