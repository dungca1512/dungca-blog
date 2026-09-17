# Kế hoạch A — bàn giao

Nền tảng: blog chạy trên Cloudflare Workers, bài viết đọc từ D1.
Nhánh: `spike/opennext-cloudflare`, đã gộp vào `main`. **Đã deploy, đã cắt tên miền.**

Tài liệu này giữ lại những thứ cần cho Kế hoạch B mà nếu không chép ra đây
sẽ mất cùng workspace tạm.

## Trạng thái

| Hạng mục | Kết quả |
|---|---|
| `npm test` | 50/50 (project `node` + `workers`) |
| `npm run typecheck` / `npm run lint` | sạch |
| `npx opennextjs-cloudflare build` | xanh |
| `npm run smoke` | 8/8 |
| Người đọc thấy gì đổi | chưa gì — nội dung y hệt, chỉ đổi nơi phục vụ từ Pages sang Worker |

Đã đo trên `wrangler dev`: `/sitemap.xml` có URL project; `/blog/<slug>/`
trả `Cache-Control: s-maxage=3600` rồi `x-nextjs-cache: HIT` ở request thứ
hai (ISR thật, không phải hằng số trang trí).

## Việc bắt buộc trước lần deploy đầu

Không việc nào trong số này đã làm — phiên dựng nhánh chạy không có quyền
Cloudflare, và mọi lệnh `--remote` đều bị cấm ở đó.

1. **Tạo D1 thật.** `npx wrangler d1 create dungca-blog`
2. **Dán `database_id` thật** vào `wrangler.jsonc` (thay
   `PLACEHOLDER-CHUA-TAO-XEM-COMMENT`). Giá trị này **không phải secret**,
   vào git là đúng.
3. **Áp migration.** `npx wrangler d1 migrations apply dungca-blog --remote`
4. **Nạp 6 bài.**
   `npx wrangler d1 execute dungca-blog --remote --file seeds/posts.sql`
   Upsert theo slug nên chạy lại được; `published_at` cố ý không nằm trong
   nhánh UPDATE.
5. **Kiểm.**
   `npx wrangler d1 execute dungca-blog --remote --command "SELECT slug, published_at FROM posts ORDER BY published_at DESC"`
6. **Tạo hai bucket R2 riêng**, không dùng chung:
   `dungca-blog-opennext-cache` (cache ISR, adapter sở hữu) và `blog-media` (ảnh).
7. ~~Cắt tên miền từ Pages sang Worker.~~ Đã xong: `blog-dungca.ai-innovation-homelab.org/*` là một
   Worker **route** (không phải custom domain), auto-build của Pages đã tắt.

## Tồn đọng chuyển sang Kế hoạch B

Ưu tiên cao — chạm vào thiết kế của Kế hoạch B, quyết sớm thì rẻ:

- **`toSlug` đang nằm trong `src/lib/article-toc.ts`.** Spec §4.2 định dùng
  chính hàm này để sinh slug bài viết ở khu admin, nên nó phải ra khỏi module
  mục lục. Kèm theo: tiêu đề bắt đầu bằng **"Đ"** sinh anchor id méo — `đ`/`Đ`
  (U+0111/U+0110) **không phân rã qua `normalize("NFD")`**, nên bị
  `[^a-z0-9\s-]` xoá sạch. Slug bài viết mà dính lỗi này thì thành URL hỏng,
  không chỉ là anchor xấu.
- **Ngữ nghĩa `published_at` khi khu admin ghi từ input người dùng.** Đừng kế
  thừa ngầm từ `scripts/migrate-posts.mjs`. Liên quan: schema hiện cho phép
  `published_at NULL` cùng lúc `status='published'`.
- **Comment "lưới an toàn" ở `blog/[slug]/page.tsx`** chỉ thành đúng khi
  `revalidatePath` được làm thật, dựa trên `WORKER_SELF_REFERENCE` +
  `dungca-blog-opennext-cache`.

Ưu tiên thường:

- `/api/search-index` chưa có `Cache-Control`.
- `TopSearch` có thể bắn vài request trùng khi focus/blur liên tiếp.
- Mỗi lượt xem bài chạy 2 truy vấn D1.
- `posts.ts`: `parseTags` chưa có test cho JSON hỏng; hàm `db()` còn ép
  `as unknown as D1Database`.
- `migrate-posts.mjs` `normalizeDate`: ngày không phải ISO lệch một ngày (parse
  theo giờ local rồi `toISOString()`); `date:` không đóng nháy trong YAML thành
  đối tượng Date → `published_at = NULL`; ngày sai định dạng lọt thẳng vào DB.
  Cả ba âm thầm, hiện chưa trúng vì 6 file đều dùng ISO có nháy.
- `quote()` trong `migrate-posts.mjs` không xử lý ký tự NUL.
- Test `buildPostRows` phần lớn kiểm hình dạng, không kiểm ánh xạ
  frontmatter → cột.
- `scripts/smoke.mjs` kiểm sitemap theo *hình dạng* URL, không đối chiếu số
  lượng/slug thật.
- **Viết lại README và `docs/01`–`docs/05`** cho luồng đăng bài mới. Hiện mới
  chỉ dán cảnh báo ở đầu.

## Ràng buộc an ninh còn hiệu lực

- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `SESSION_SECRET` chỉ nạp qua
  `wrangler secret put`. **Không bao giờ** vào `wrangler.jsonc` — file đó nằm
  trong git.
- `.dev.vars` đã được gitignore (làm ở vòng này).
- Access token GitHub vứt ngay sau khi xác minh danh tính, không lưu.
- Danh tính admin nằm ở biến môi trường `ADMIN_GITHUB_LOGIN`, không hardcode.
- Cookie phiên: `httpOnly`, `Secure`, `SameSite=Lax`, ký HMAC-SHA256 bằng WebCrypto.
- Mọi truy vấn D1 dùng prepared statement có bind. Không ORM.

## Bài học đắt nhất của Kế hoạch A

`getCloudflareContext({ async: true })` **rò một instance Miniflare/workerd
cho mỗi lần render trang lúc build và không bao giờ dọn**. Chỉ vài trang là
các instance đó tranh khoá cùng một file SQLite và build đổ với
`SQLITE_BUSY_RECOVERY`. Mức hỏng tỉ lệ với **số trang prerender có đọc D1**,
không phải với mức song song của build.

Vì thế: route nào đọc D1 thì phải `force-dynamic`. `tests/route-config.test.ts`
khoá quy tắc đó — đừng nới nó mà không đọc comment đầu file.

Và `src/lib/projects.ts` đọc `node:fs`, nên **chỉ chạy được lúc build**.
Route `force-dynamic` mà import vào đó sẽ hỏng âm thầm ở production: ENOENT
bị nuốt, hàm trả mảng rỗng, trang vẫn 200. Đúng lỗi đã xảy ra với sitemap.
