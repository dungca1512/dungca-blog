# Kế hoạch B — bàn giao

Khu admin: đăng nhập GitHub OAuth, viết/sửa/đăng bài thẳng trên web, upload ảnh lên R2.
Nhánh: `worktree-ke-hoach-b-cms`, gộp vào `main` là deploy tự động qua GitHub Actions.

## Trạng thái

| Hạng mục | Kết quả |
|---|---|
| `npm test` | 142/142 (node + workers) |
| `npm run typecheck` / `npm run lint` / `npm run check:colors` | sạch |
| `npm run build` | xanh, 0 skip |
| `npm run smoke` | 10/10 (kể cả 2 kiểm bảo mật /admin) |

## Đường đăng nhập

1. Mở `https://blog-dungca.ai-innovation-homelab.org/admin`
2. Middleware chuyển sang `/api/auth/login` → GitHub OAuth
3. GitHub xác nhận → callback → Worker ký session cookie HMAC-SHA256 → về `/admin`
4. Từ đây: danh sách bài, tạo bài, soạn Markdown, xem trước, lưu nháp, đăng bài, upload ảnh

Session hết hạn sau 30 ngày. Để đăng xuất: bấm "Đăng xuất" trong admin layout.

## Ba Worker secret bắt buộc

Kiểm bằng: `npx wrangler secret list`

| Secret | Mô tả |
|---|---|
| `GITHUB_CLIENT_ID` | OAuth App trên GitHub (Settings → Developer settings) |
| `GITHUB_CLIENT_SECRET` | Cặp với ID trên |
| `SESSION_SECRET` | Chuỗi ngẫu nhiên dài ≥ 32 ký tự, ký cookie |

Đặt bằng: `npx wrangler secret put <TÊN>`

**Cách lấy lại quyền vào khi bị mất (hoặc session bị chiếm):**
Chạy `npx wrangler secret put SESSION_SECRET` với giá trị mới — thao tác này
đá toàn bộ session hiện có ra, kể cả session đang bị chiếm. Không cần làm gì
thêm.

## Hai GitHub secret cho deploy tự động

Kiểm bằng: `gh secret list --repo dungca1512/dungca-blog`

| Secret | Giá trị |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Token có quyền Workers Scripts, D1, R2, Workers Routes |
| `CLOUDFLARE_ACCOUNT_ID` | `191981d1cad9bc625cf662dfe2cba36e` |

## Tên miền ảnh

Ảnh upload được phục vụ qua `https://media-blog.ai-innovation-homelab.org`
(tên miền riêng gắn thẳng vào R2 bucket `blog-media`), **không đi qua Worker**.

Lý do tách: mỗi lần tải ảnh qua Worker là một lần gọi tính tiền. R2 phục vụ
trực tiếp thì băng thông ra miễn phí và ảnh cũng không cần logic gì.

Cấu hình qua `wrangler secret put MEDIA_BASE_URL` → giá trị
`https://media-blog.ai-innovation-homelab.org`.

## Luồng deploy tự động

Push lên `main` → GitHub Actions chạy `.github/workflows/deploy.yml`:

```
lint → typecheck → test → check:colors
  → D1 migrations apply --remote
  → opennextjs-cloudflare build
  → opennextjs-cloudflare populateCache remote
  → wrangler deploy
  → smoke https://blog-dungca.ai-innovation-homelab.org
```

**Thứ tự không đổi được.** Migration trước deploy: code mới đọc cột chưa có là
mọi trang đổ; code cũ gặp cột thừa thì không sao. Đây là lý do migration chỉ
được phép cộng thêm (thêm cột/bảng), không đổi tên, không xoá.

`populateCache` không bỏ được: thiếu thì mọi bài trả 404 kèm
`NoFallbackError` trong khi log build vẫn xanh. Đã xảy ra thật ở Kế hoạch A.

## Cách rollback

```bash
npx wrangler versions list
npx wrangler rollback --version-id <id>
```

**Rollback KHÔNG lùi migration D1.** Code cũ hơn chạy với schema mới hơn —
ổn nếu migration chỉ cộng thêm (cột/bảng thừa không gây lỗi). Nếu migration
xoá hoặc đổi tên thì rollback sẽ hỏng. Đây là lý do quy tắc "chỉ cộng thêm"
không có ngoại lệ.

## Thay đổi quan trọng so với Kế hoạch A

### `toSlug` đã sửa lỗi `đ`/`Đ`

`src/lib/article-toc.ts` — `toSlug` đã xử lý thêm U+0111/U+0110 (`đ`/`Đ`)
trước khi chuẩn hoá NFD. `normalize("NFD")` không phân rã hai ký tự này nên
phiên bản cũ xoá chúng sạch → slug bài bắt đầu bằng "Đ" thành URL hỏng.

**Tác dụng phụ:** bài viết cũ có tiêu đề chứa "đ"/"Đ" mà đã được đánh dấu
(link anchor trong mục lục) thì anchor id đã thay đổi. URL bài viết không đổi
(slug sinh lúc `POST /api/admin/posts`, không tính lại), chỉ anchor `#...`
bên trong bài bị đổi. Ít ảnh hưởng thực tế nhưng cần biết.

### Schema bài viết

Bảng `posts` có đủ các cột cần cho admin: `title`, `summary`, `body_markdown`,
`tags` (JSON), `status` (`draft`/`published`), `published_at`, `updated_at`.
`updated_at` tự cập nhật qua trigger SQL sau mỗi lần UPDATE.

`published_at` nhận giá trị tại thời điểm đăng (`POST .../publish`), không
phải lúc tạo bài. Trước đó có thể NULL cùng `status='draft'` — đây là hành vi
có chủ ý, khác với `migrate-posts.mjs` ở Kế hoạch A.

## Tồn đọng chuyển sang sau

- Viết lại README và `docs/01`–`docs/05` cho luồng đăng bài mới (hiện chỉ có
  cảnh báo dán đầu).
- `/api/search-index` chưa có `Cache-Control`.
- `TopSearch` có thể bắn vài request trùng khi focus/blur liên tiếp.
- Mỗi lượt xem bài chạy 2 truy vấn D1.
- `scripts/smoke.mjs` kiểm sitemap theo hình dạng URL, chưa đối chiếu slug thật.

## Ràng buộc an ninh còn hiệu lực

Kế thừa từ Kế hoạch A — xem `ke-hoach-a-ban-giao.md` mục "Ràng buộc an ninh".
Bổ sung của Kế hoạch B:

- Danh sách MIME được phép upload là danh sách **cho phép**, không phải danh
  sách cấm: kiểu mới xuất hiện thì mặc định bị từ chối.
- Giới hạn upload: 5 MB. Vượt trả 413.
- Key object R2 có hậu tố UUID ngẫu nhiên — trùng key là ghi đè ảnh bài cũ
  (mất dữ liệu trong im lặng). Tên file client gửi được cắt basename trước.
- `Content-Type` trả về từ R2 lấy từ danh sách cho phép đã kiểm, không dùng
  thẳng chuỗi client gửi.
