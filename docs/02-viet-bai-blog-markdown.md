# Viết và đăng bài

Bài viết nằm trong **D1**, không nằm trong git. Viết bài không cần clone repo,
không cần commit, không cần deploy. Thêm file vào `content/posts/` **không**
tạo ra bài mới — thư mục đó chỉ còn là nguồn cho lần chuyển dữ liệu cũ.

## Vào khu quản trị

<https://blog-dungca.ai-innovation-homelab.org/admin>

Đăng nhập bằng GitHub. Chỉ đúng một tài khoản vào được: tài khoản khai ở
`ADMIN_GITHUB_LOGIN` trong `wrangler.jsonc`. Đăng nhập bằng tài khoản GitHub
khác thì sau bước OAuth nhận thẳng trang 403 "Không thể đăng nhập.".

Trang `/admin` liệt kê **cả nháp lẫn bài đã đăng**, sắp theo lần sửa gần nhất.

## Soạn bài

"Viết bài mới" → biểu mẫu có bốn ô:

| Ô | Ghi chú |
|---|---|
| Tiêu đề | Bắt buộc. Để trống thì không lưu được. Slug sinh từ đây. |
| Tóm tắt | Hiện ở danh sách bài và thẻ Open Graph. |
| Thẻ | Gõ liền một dòng, **cách nhau bằng dấu phẩy**. |
| Thân bài | Markdown thuần, không frontmatter. |

Hai tab **Soạn** / **Xem trước**. Tab xem trước render bằng đúng pipeline
Markdown của trang công khai, nên thấy sao là ra vậy.

Không có frontmatter. Tiêu đề, tóm tắt, thẻ là cột trong D1 chứ không phải
mấy dòng YAML đầu file nữa.

## Ba cái nút

- **Lưu nháp** — ghi vào D1 với `status = 'draft'`. Bài chưa lên mạng.
- **Đăng bài** — lưu nháp trước, rồi chuyển `status = 'published'`. Lên mạng ngay.
- **Gỡ về nháp** — chỉ hiện với bài đã đăng. Trang bài trả 404 lại.

Khi đăng hoặc gỡ, server dọn cache của `/`, `/blog`, `/blog/<slug>` và
`/sitemap.xml`. Không phải chờ, không phải deploy lại.

`published_at` chỉ ghi ở **lần đăng đầu tiên**. Gỡ bài xuống sửa lỗi chính tả
rồi đăng lại thì nó vẫn nằm đúng chỗ cũ trong danh sách, không nhảy lên đầu
như bài mới.

## Slug và link đã chia sẻ

Slug sinh tự động từ tiêu đề (bỏ dấu, thay dấu cách bằng `-`). Trùng slug thì
thêm hậu tố `-2`, `-3`.

Luật quan trọng: **slug của bài đã đăng không đổi nữa**. Sửa tiêu đề một bài
đang đăng chỉ đổi chữ hiển thị, URL giữ nguyên — link đã gửi cho người khác
không gãy. Bài còn ở dạng nháp thì slug vẫn chạy theo tiêu đề.

URL công khai:

- Danh sách: `/blog`
- Bài: `/blog/<slug>`

## Mất mạng giữa chừng

Trình soạn thảo lưu nội dung đang gõ vào `localStorage` của trình duyệt sau
mỗi thay đổi, và xoá bản đó khi lưu lên server thành công. Đóng nhầm tab thì
mở lại vẫn còn chữ — nhưng đó là bản cứu hộ trong máy, không phải bản lưu.
Bấm "Lưu nháp" mới là lưu.

## Xoá hẳn một bài

Giao diện chưa có nút xoá — cố ý, xoá bài là thao tác không hoàn tác được.
Khi thật sự cần, gọi API bằng session admin đang đăng nhập:

```text
DELETE /api/admin/posts/<id>
```

`<id>` là số trong URL trang sửa bài (`/admin/posts/42`). Ảnh của bài **không**
bị xoá theo, chúng vẫn nằm trong R2.

## Khi có sự cố

| Triệu chứng | Nguyên nhân thường gặp |
|---|---|
| 403 "Không thể đăng nhập." | Sai tài khoản GitHub, hoặc cookie `state` bị mất giữa chừng |
| Lưu thất bại (401) | Session hết hạn (30 ngày). Đăng nhập lại. |
| Đăng rồi mà `/blog` chưa thấy | Xem [04 — mục "Cache và bài mới đăng"](./04-trien-khai-cloudflare-workers.md) |
