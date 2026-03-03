# Cài đặt và chạy local

## Yêu cầu

- Node.js 20
- npm 10+

## Cài đặt

```bash
npm install
```

## Chạy môi trường dev

```bash
npm run dev
```

Mặc định truy cập tại `http://localhost:3000`.

## Lệnh kiểm tra trước khi push

```bash
npm run lint
npm run build
```

## Cấu trúc thư mục quan trọng

```text
content/
  posts/      # Bài viết blog Markdown
  projects/   # Trang demo dự án Markdown
public/
  images/
    posts/    # Ảnh bài viết
src/
  app/        # Next.js App Router pages
```
