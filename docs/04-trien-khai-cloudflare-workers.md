# Triển khai trên Cloudflare Workers

Blog chạy bằng **Cloudflare Workers**, không phải Cloudflare Pages. Project
Pages cũ (`dungca-blog.pages.dev`) đã xoá.

## Bản đồ hạ tầng

| Thành phần | Tên | Dùng để |
|---|---|---|
| Worker | `dungca-blog` | Chạy toàn bộ app (SSR, route API, admin) |
| Route | `blog-dungca.ai-innovation-homelab.org/*` | Tên miền thật |
| D1 | `dungca-blog` (binding `DB`) | Bài viết |
| R2 | `blog-media` (binding `BLOG_MEDIA`) | Ảnh trong bài |
| R2 | `dungca-blog-opennext-cache` | Cache ISR, do adapter OpenNext tự quản |
| Assets | `.open-next/assets` (binding `ASSETS`) | File tĩnh |
| Service | `WORKER_SELF_REFERENCE` | Worker tự gọi mình — thiếu là `revalidatePath` vô tác dụng |

Tất cả khai trong [`wrangler.jsonc`](../wrangler.jsonc). File đó có chú thích
lý do cho từng lựa chọn — đọc trước khi sửa, đừng sửa rồi mới đọc.

`workers.dev` tắt cố ý: một nội dung chỉ nên có một địa chỉ.

Dùng **route** chứ không phải `custom_domain`: hostname này còn bản ghi DNS
proxy từ thời Pages, mà token wrangler không có quyền ghi DNS để dọn. Route bám
được vào bản ghi sẵn có, custom domain thì không (lỗi 100117).

`SITE_URL` khai một chỗ duy nhất ở [`src/lib/site.ts`](../src/lib/site.ts), dùng
lại cho `metadataBase`, canonical, Open Graph, `sitemap.xml`, `robots.txt`. Đổi
tên miền thì sửa đúng file đó (và route trong `wrangler.jsonc`).

## Deploy

Bình thường **không ai deploy bằng tay**: push lên `main` là GitHub Actions
deploy. Xem [05](./05-ci-cd-github-actions.md).

Deploy tay khi cần (ví dụ Actions đang hỏng):

```bash
npm run cf:deploy
```

## Thứ tự deploy, không đổi được

```text
migration D1  →  build  →  populateCache  →  wrangler deploy  →  smoke
```

- **Migration trước deploy.** Code mới đọc cột chưa tồn tại là đổ cả trang;
  code cũ chạy với cột thừa thì không sao. Đây cũng là lý do migration **chỉ
  được cộng thêm**: không đổi tên, không xoá cột, không xoá bảng.
- **`populateCache` trước `deploy`.** Bỏ bước này thì mọi trang bài trả 404 kèm
  `NoFallbackError` trong khi log build vẫn xanh. Đã xảy ra thật.
- **Smoke sau cùng.** "Deploy thành công" chỉ nói wrangler tải code lên được,
  không nói trang nào mở được.

## Secret

Bốn secret, nạp bằng `wrangler secret put`, **không bao giờ viết vào
`wrangler.jsonc`**:

| Secret | Là gì |
|---|---|
| `GITHUB_CLIENT_ID` | OAuth App của production |
| `GITHUB_CLIENT_SECRET` | — |
| `SESSION_SECRET` | Khoá ký cookie session (≥ 32 ký tự ngẫu nhiên) |
| `MEDIA_BASE_URL` | Tên miền công khai của bucket ảnh |

```bash
npx wrangler secret list          # xem đủ bốn cái chưa (không lộ giá trị)
npx wrangler secret put SESSION_SECRET
```

Đổi `SESSION_SECRET` là **đá mọi phiên đăng nhập hiện có** — đúng thứ cần làm
khi nghi lộ, phiền khi làm nhầm.

`ADMIN_GITHUB_LOGIN` nằm ở `vars` trong `wrangler.jsonc` chứ không phải secret:
đó là username GitHub công khai, và để lộ thiên thì đọc config là biết ai vào
được admin.

App khai thiếu bất kỳ biến nào trong bốn cái trên sẽ **ném lỗi**, không chạy
tiếp với giá trị mặc định. Một `SESSION_SECRET` rỗng vẫn ký được token — và ai
cũng ký được token y hệt.

## Cache và bài mới đăng

Trang bài dùng ISR. Khi bấm "Đăng bài", server gọi `revalidatePath` cho `/`,
`/blog`, `/blog/<slug>`, `/sitemap.xml`. Bài lên ngay, không cần deploy.

Nếu đăng rồi mà trang vẫn 404 hoặc danh sách vẫn thiếu:

1. Kiểm tra binding `WORKER_SELF_REFERENCE` còn trong `wrangler.jsonc` không —
   thiếu nó thì `revalidatePath` im lặng không làm gì.
2. Xem bài có thật sự `status = 'published'` chưa:
   ```bash
   npx wrangler d1 execute dungca-blog --remote \
     --command "SELECT slug, status FROM posts ORDER BY updated_at DESC LIMIT 5"
   ```
3. Chạy smoke để biết đây là lỗi một bài hay lỗi cả site:
   ```bash
   npm run smoke https://blog-dungca.ai-innovation-homelab.org
   ```

## Rollback

```bash
npx wrangler versions list          # 10 version gần nhất, kèm id
npx wrangler rollback <version-id>  # quay về đúng version đó
```

**Rollback không lùi D1.** Code quay về bản cũ, dữ liệu thì không — bài đã đăng
vẫn đăng, cột migration mới thêm vẫn còn. Đó chính là lý do migration chỉ được
phép cộng thêm: bản code cũ phải sống được với schema mới.

Rollback cũng không lùi ảnh đã upload lên R2.

## Kiểm tra sau mỗi lần đụng vào hạ tầng

```bash
npm run smoke https://blog-dungca.ai-innovation-homelab.org
```

Các phép kiểm: trang chính, danh sách, sitemap có đủ slug bài đã đăng thật,
mở được một bài và một dự án lấy từ chính sitemap, `/admin` phải chuyển hướng
và `/api/admin/posts` phải trả 401 với người chưa đăng nhập.
