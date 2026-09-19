# Cài đặt và chạy local

## Yêu cầu

- Node.js 22 (CI dùng 22; Node 20 đã bị bỏ)
- npm 10+

## Cài đặt

```bash
npm install
```

## Hai cách chạy

### `npm run dev` — nhanh, để sửa giao diện

```bash
npm run dev     # http://localhost:3000
```

Next dev server. Sửa file là thấy ngay. Đây là chỗ làm phần lớn công việc.

### `npm run cf:preview` — chậm, để kiểm điều thật sự chạy trên production

```bash
npm run cf:preview   # http://localhost:8788
```

Build OpenNext → nạp cache → `wrangler dev`, tức là chạy trên **workerd**, đúng
runtime của production. Dùng khi đụng tới D1, R2, session, middleware — những
thứ `next dev` mô phỏng không giống hẳn.

Smoke test mặc định trỏ vào cổng 8788 chính là để kiểm bản này:

```bash
npm run smoke                 # kiểm localhost:8788
npm run smoke -- <url>        # kiểm một môi trường khác
```

## Dữ liệu local

D1 ở local là một file SQLite riêng, **không phải** database production —
`wrangler.jsonc` cố ý không đặt `"remote": true` cho binding `DB`. Muốn chạm
bản thật thì phải gõ `--remote` rõ ràng.

Tạo bảng và đổ dữ liệu mẫu:

```bash
npx wrangler d1 migrations apply dungca-blog --local
npx wrangler d1 execute dungca-blog --local --file=seeds/posts.sql
```

Xem nhanh dữ liệu đang có:

```bash
npx wrangler d1 execute dungca-blog --local \
  --command "SELECT slug, status FROM posts"
```

## Đăng nhập admin ở local

`/admin` cần GitHub OAuth và session secret. Đặt trong `.dev.vars` (file này
đã nằm trong `.gitignore`, đừng commit):

```text
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
SESSION_SECRET=chuỗi-ngẫu-nhiên-ít-nhất-32-ký-tự
MEDIA_BASE_URL=https://media-blog.ai-innovation-homelab.org
```

OAuth App dùng cho local phải khai callback về `http://localhost:8788/api/auth/callback`
— một OAuth App chỉ nhận một callback URL, nên thường tạo App riêng cho local,
tách khỏi App của production.

## Trước khi push

```bash
npm run verify
```

Chạy lần lượt: `lint` → `typecheck` → `test` → `check:colors` → `build`. Đây
đúng bốn cổng mà CI chạy, cộng thêm build. Chạy trước ở local thì không phải
chờ CI báo đỏ.

Chạy riêng từng phần khi cần:

```bash
npm test                    # vitest, cả node lẫn workerd
npx vitest run --project node
npx vitest run --project workers
```

## Cấu trúc thư mục quan trọng

```text
src/
  app/          # route App Router (gồm /admin và /api/admin)
  lib/          # posts (D1), auth, session, media (R2), markdown
  components/   # giao diện + trình soạn thảo admin
content/
  projects/     # trang dự án, vẫn là Markdown trong repo
  posts/        # DI SẢN: nguồn cho scripts/migrate-posts.mjs, không phải nguồn bài
migrations/     # migration D1
seeds/          # dữ liệu mẫu cho local
tests/          # *.test.ts chạy Node; tests/workers/* chạy workerd
```
