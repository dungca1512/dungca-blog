# Thiết kế: Blog CMS trên Cloudflare Workers

Ngày: 2026-09-17
Trạng thái: chờ duyệt

## 1. Bối cảnh

Blog hiện là Next.js 16.1.6 build tĩnh (`output: "export"`), deploy Cloudflare
Pages. Bài viết là file Markdown trong `content/posts/`, đăng bài nghĩa là
commit rồi push rồi đợi build.

Bốn động lực đổi, theo thứ tự tác giả nêu:

1. Viết được từ điện thoại hoặc máy khác
2. Học và thực hành auth + CMS
3. Bỏ vòng commit → push → đợi build
4. Có khung xem trước khi soạn

Static export không có runtime nên không xử lý được đăng nhập hay ghi dữ liệu.
Đây là rào cản thật, không phải chuyện framework — project vốn đã là Next.js.

## 2. Phạm vi

**Trong phạm vi (sub-project 1 — CMS):** chuyển sang Workers, đưa bài viết vào
D1, đăng nhập bằng GitHub OAuth, khu admin có soạn thảo Markdown kèm xem
trước, upload ảnh lên R2, CI/CD, và mang lớp design token của portfolio sang.

**Ngoài phạm vi (sub-project 2 — thị giác):** hiệu ứng motion, SVG art và ảnh
minh hoạ của portfolio. Độc lập với sub-project 1, làm sau, có spec riêng.

**Không làm:** nhiều người dùng, phân quyền, bình luận, WYSIWYG (xem §6.2),
đưa `content/projects/` vào database (xem §4.2).

## 3. Kết quả spike (đã kiểm chứng, không phải giả định)

Spike chạy trên nhánh `spike/opennext-cloudflare` ngày 2026-09-17.

| Câu hỏi | Kết quả |
|---|---|
| Next 16.1.6 chạy được với `@opennextjs/cloudflare` không? | **Không.** Peer range là `>=15.5.24 <16 \|\| >=16.3.3`; 16.1.6 rơi vào khe hở |
| Có lối thoát không? | **Có — nâng lên 16.3.5.** Không phải hạ phiên bản |
| Build ra Worker được không? | Có, `.open-next/worker.js` |
| Phục vụ được site hiện tại không? | Có, 8/8 route trả 200 dưới `wrangler dev` |
| Backend cache là gì? | **R2**, không phải KV |

**Cái bẫy quan trọng nhất:** `opennextjs-cloudflare populateCache` là một bước
riêng và bắt buộc. Lần chạy đầu bỏ qua nó, mọi trang prerender trả 404 kèm
`NoFallbackError`, trong khi build log vẫn báo thành công. Xem §7.1.

Worker cũng cần service binding tự trỏ về chính nó (`WORKER_SELF_REFERENCE`)
để revalidate hoạt động.

## 4. Kiến trúc

### 4.1 Hạ tầng

| Mảnh | Chọn | Ghi chú |
|---|---|---|
| Runtime | `@opennextjs/cloudflare` 1.20.6 | Next 16.3.5 |
| Database | **D1** | SQLite, binding thẳng, không cần connection pool |
| Ảnh | **R2** bucket `blog-media` + tên miền riêng | Không phục vụ ảnh qua Worker |
| Cache ISR | **R2** bucket `dungca-blog-opennext-cache` | Mặc định của adapter |
| Secrets | `wrangler secret put` | Không để trong `wrangler.jsonc` (file này vào git) |

**Hai bucket R2 tách biệt, không dùng chung.** Cache ISR do adapter tự quản
và tự xoá; ảnh người dùng upload phải sống lâu dài. Trộn chung là để adapter
có quyền trên dữ liệu nó không sở hữu.

Chọn D1 thay vì Postgres qua Hyperdrive: blog có 6 bài, Postgres chỉ thêm độ
phức tạp mà không thêm năng lực.

**Không dùng ORM.** `wrangler d1 migrations` cho schema (file SQL đánh số, có
version) và prepared statement thô trong code. Với một bảng, Drizzle chỉ che
mất thứ đang cần học.

### 4.2 Ràng buộc nền tảng: Worker không có filesystem lúc chạy

Mọi thứ trong `content/` chỉ đọc được lúc `next build`. Điều này biến một quy
ước lỏng lẻo thành ràng buộc cứng:

- `lib/posts.ts` → D1, qua binding
- `lib/projects.ts` → vẫn đọc file, **bắt buộc** chỉ chạy lúc build. Giữ
  `dynamicParams = false` cho route projects để biến điều này thành lời hứa
  có hiệu lực thay vì tình cờ đúng
- `lib/markdown.ts` → pipeline remark dùng chung

**Projects cố ý ở lại dạng file.** Trang dự án sửa vài tháng một lần, không có
nhu cầu viết từ điện thoại. Đưa vào DB là thêm bảng, thêm màn admin, thêm
migration mà không giải quyết động lực nào ở §1.

Việc tách `content.ts` (hiện ~350 dòng, làm hai việc không liên quan) thành
hai module là hệ quả trực tiếp của ràng buộc này, không phải refactor tuỳ hứng.

### 4.3 Schema D1

Bảng `posts`:

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | INTEGER PK | |
| `slug` | TEXT UNIQUE | sinh bằng `toSlug` trong `lib/article-toc.ts` (§4.6), sửa được tay |
| `title` | TEXT | |
| `summary` | TEXT | |
| `tags` | TEXT | JSON array |
| `body_markdown` | TEXT | **nguồn sự thật** |
| `status` | TEXT | `draft` \| `published` |
| `published_at` | TEXT | chỉ đặt khi publish lần đầu |
| `created_at` | TEXT | |
| `updated_at` | TEXT | |

HTML **không** lưu trong DB — render từ Markdown lúc đọc, để đổi pipeline
remark là toàn bộ bài cũ đổi theo.

### 4.4 Thay đổi chiến lược render

`src/app/blog/[slug]/page.tsx:19` đang đặt `dynamicParams = false`. Nghĩa là
slug nào không có trong `generateStaticParams` lúc build sẽ 404 — chính xác là
số phận của mọi bài viết sau khi deploy. `generateStaticParams` cũng không
enumerate D1 được vì lúc build không có binding.

Đổi sang `dynamicParams = true` + ISR, bỏ hẳn `generateStaticParams`.

**Đánh đổi:** mất prerender lúc build cho bài viết, đổi lấy đăng bài tức thì.
Bài render lần đầu khi có người đọc, sau đó nằm trong R2 cache; người đọc thứ
hai trở đi nhận HTML từ cache edge, không đụng D1.

`src/app/sitemap.ts:6` đang `dynamic = "force-static"` cũng phải bỏ, vì giờ nó
đọc D1.

### 4.5 Migration nội dung

Script chạy ở local bằng Node (nơi còn có fs): đọc `content/posts/` qua
`gray-matter`, sinh SQL, nạp bằng `wrangler d1 execute --remote`.

Upsert theo slug để chạy lại nhiều lần không nhân bản. File `.md` cũ giữ
nguyên trong git làm bản lưu, **không xoá** ở giai đoạn này.

### 4.6 Một cải thiện có chủ đích

`src/app/blog/[slug]/page.tsx` dài ~300 dòng, trộn layout với ba hàm thuần tuý
dựng mục lục (`buildArticleHtmlAndToc`, `stripHtml`, `toSlug`). Tách sang
`lib/article-toc.ts`: dù sao cũng phải sửa file này, và logic thuần tuý thì
test được độc lập còn nhúng trong page thì không.

Không refactor gì khác ngoài phạm vi.

## 5. Design token

Mang lớp token `--base-*` của portfolio sang **ngay trong sub-project 1**, dù
motion và SVG art để lại sub-project 2.

Lý do là thứ tự công việc: sub-project 1 dựng toàn bộ giao diện admin. Dựng
trên token xanh lá hiện tại rồi sau đổi sang `--base-*` là sơn lại màn admin
hai lần. Token chỉ là biến CSS nên mang sang rẻ.

Kèm theo script `check:colors` của portfolio để chặn màu hardcode.

Hệ quả: blog đổi từ xanh lá `#1a8917` sang tím `#4e46b4` + teal, và có nút
chuyển theme thay vì chỉ theo `prefers-color-scheme`. Đây là quyết định đã
chốt, không phải tác dụng phụ.

## 6. Đăng nhập và soạn thảo

### 6.1 Auth — tự viết vòng GitHub OAuth

Không dùng Auth.js: thư viện này chạy trên Workers khá lắt léo, và tự làm thì
đúng với động lực số 2 ở §1.

Luồng: `/admin` → chuyển sang GitHub kèm `state` ngẫu nhiên (lưu cookie
httpOnly, chống CSRF) → GitHub gọi về `/api/auth/callback` → đổi `code` lấy
access token → gọi `/user` → **chỉ chấp nhận đúng một tài khoản**, đặt trong
biến `ADMIN_GITHUB_LOGIN`, không hardcode.

Session là cookie ký HMAC-SHA256 qua WebCrypto (có sẵn trong Workers, không
cần thư viện): `httpOnly`, `Secure`, `SameSite=Lax`, hạn 30 ngày.

Access token của GitHub dùng xong vứt — sau bước xác minh danh tính nó không
còn việc gì, nên không lưu.

Secrets: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `SESSION_SECRET`.

Middleware chặn `/admin/*` và mọi API ghi.

### 6.2 Trình soạn thảo — Markdown + xem trước, chưa làm WYSIWYG

Tác giả có nêu mong muốn WYSIWYG. Đề xuất làm khác, và lý do cần ghi lại:
WYSIWYG kiểu contenteditable là dependency lớn, và chỗ đau thật là vòng chuyển
đổi Markdown ↔ rich text làm méo nội dung — code block và bảng là hai nạn nhân
thường xuyên, mà blog kỹ thuật dùng cả hai liên tục.

Thay vào đó: soạn Markdown, xem trước dựng bằng **chính `lib/markdown.ts`**
chạy phía client. remark chạy được trong trình duyệt, nên thứ thấy lúc soạn
đúng bằng byte với thứ sẽ lên site — điều WYSIWYG không đảm bảo.

Markdown vẫn là nguồn sự thật, nên nâng lên WYSIWYG sau này không mất gì.

### 6.3 Ba chi tiết cho việc viết từ điện thoại

Đây là động lực số một, nên ba điểm này là yêu cầu chứ không phải tuỳ chọn:

- Xem trước là **tab chuyển qua lại**, không phải hai khung cạnh nhau
- **Tự lưu nháp vào localStorage** theo nhịp gõ — mạng 4G rớt giữa chừng là
  chuyện thường, mất bài một lần là thôi dùng
- Nút lưu nháp tách khỏi nút đăng

### 6.4 Ảnh

Upload lên R2 qua `/api/admin/upload`, trả URL, chèn cú pháp Markdown tại vị
trí con trỏ. Phục vụ ảnh qua tên miền riêng gắn vào R2, không đi qua Worker —
ảnh tĩnh không có lý do gì phải tốn một lần chạy Worker.

### 6.5 Luồng đăng bài

Đổi `status` sang `published`, đặt `published_at` nếu là lần đầu, rồi gọi
`revalidatePath` cho `/`, `/blog`, trang bài và sitemap.

## 7. CI/CD và kiểm thử

### 7.1 Thứ tự pipeline là chỗ dễ sai nhất

Workflow hiện tại (`.github/workflows/ci.yml`) chỉ lint + build. Thêm deploy
vào phải theo đúng thứ tự:

```
lint → typecheck → test → d1 migrations apply --remote
     → opennextjs-cloudflare build
     → opennextjs-cloudflare populateCache
     → opennextjs-cloudflare deploy
     → smoke test
```

**Bỏ `populateCache` thì deploy ra một site 404 sạch sẽ mà build log vẫn
xanh.** Spike đã dính đúng lỗi này. Đây là lý do có bước smoke test.

Migration D1 chạy **trước** deploy, để code mới không gặp schema cũ.

### 7.2 Smoke test sau deploy

`curl` các route chính (`/`, `/blog/`, một trang bài, `/sitemap.xml`) và
khẳng định 200. Lý do tồn tại: spike chứng minh build xanh vẫn có thể phục vụ
404. Build thành công không phải bằng chứng site chạy.

### 7.3 Kiểm thử

Mang cấu hình vitest từ portfolio sang. Ưu tiên test:

- `lib/article-toc.ts` — logic thuần tuý, vừa tách ra
- `lib/markdown.ts` — bảo đảm preview và production khớp nhau
- **Ký và xác minh session** — code bảo mật, xứng đáng có test: chữ ký sai,
  cookie hết hạn, và login không nằm trong `ADMIN_GITHUB_LOGIN` đều phải bị từ chối
- Sinh slug từ tiêu đề tiếng Việt có dấu

Theo mẫu script `verify` của portfolio để gom các bước kiểm tra vào một lệnh.

### 7.4 Quay lui

`wrangler versions` + `wrangler rollback` cho phần Worker. Migration D1 viết
theo hướng cộng thêm (thêm cột, không đổi tên) để rollback Worker không gặp
schema không tương thích.

## 8. Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| Deploy xanh nhưng site 404 (`populateCache`) | Smoke test bắt buộc trong pipeline (§7.2) |
| Adapter tụt lại sau bản Next mới | Ghim phiên bản Next; nâng cấp là việc có chủ ý, không tự động |
| Mất bài đang viết trên điện thoại | Tự lưu localStorage (§6.3) |
| `SESSION_SECRET` lộ | Chỉ nạp qua `wrangler secret put`; `wrangler.jsonc` không chứa secret |
| Mất dữ liệu D1 | D1 có time-travel; thêm export định kỳ |
| Bài viết mất prerender, lần đọc đầu chậm | Chấp nhận có ý thức (§4.4); cache edge lo phần còn lại |

## 9. Thứ tự triển khai

1. Nâng Next 16.3.5 + adapter + `wrangler.jsonc` (nhánh spike đã làm)
2. Mang token `--base-*` + `check:colors`
3. Schema D1 + `lib/posts.ts` + tách `lib/projects.ts`, `lib/markdown.ts`, `lib/article-toc.ts`
4. Đổi chiến lược render (§4.4) + sitemap động
5. Script migration 6 bài
6. Auth GitHub OAuth + middleware
7. Khu admin: danh sách, soạn thảo, xem trước, tự lưu
8. Upload ảnh R2
9. CI/CD + smoke test
10. Cắt tên miền từ Pages sang Worker

Bước 1–5 giữ site chạy như cũ với người đọc. Bước 10 là bước duy nhất người
đọc nhìn thấy, và quay lui được bằng cách trỏ tên miền về Pages.
