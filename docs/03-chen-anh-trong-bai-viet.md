# Chèn ảnh trong bài viết

Ảnh trong bài nằm ở **R2** (bucket `blog-media`), không nằm trong repo. Không
còn chuyện bỏ file vào `public/images/posts/` rồi commit.

## Cách làm

1. Mở bài trong `/admin`, đặt con trỏ vào chỗ muốn có ảnh.
2. Bấm **Chèn ảnh**, chọn file.
3. Trình soạn thảo upload rồi chèn `![](https://media-blog…/…)` **tại đúng vị
   trí con trỏ**.
4. Gõ mô tả vào giữa hai ngoặc vuông: `![Sơ đồ pipeline](https://…)`.

Bước 4 không tự động được — máy không biết ảnh vẽ gì. Ảnh thiếu `alt` là ảnh
vô hình với trình đọc màn hình và với Google.

## Giới hạn

| Thứ | Giá trị | Lý do |
|---|---|---|
| Dung lượng | 5 MB mỗi file | Vượt mức này là ảnh chưa nén. R2 tính tiền theo dung lượng lưu. |
| Kiểu file | `png`, `jpeg`, `webp`, `gif`, `svg+xml` | Danh sách **cho phép**: kiểu lạ mặc định bị từ chối. |

Server kiểm cả hai, không tin phía trình duyệt: `Content-Type` lưu vào R2 là
kiểu đã qua danh sách cho phép, không phải chuỗi client gửi lên. Một file
`.html` gắn nhãn `image/png` không thể trở lại thành HTML khi phục vụ.

## Tên file trên R2

```text
2026/09/so-do-pipeline-a1b2c3d4e5.png
   │   │        │             │
   │   │        │             └─ 10 ký tự ngẫu nhiên
   │   │        └─ tên file gốc, bỏ dấu, kebab-case
   └───┴─ năm/tháng lúc upload (UTC)
```

Hậu tố ngẫu nhiên là thứ bảo đảm hai lần upload cùng tên file không ghi đè
nhau — ghi đè ở đây là mất ảnh của bài cũ trong im lặng. Đổi lại, cùng một ảnh
upload hai lần là hai object, tốn chỗ gấp đôi.

Vì tên đã duy nhất nên nội dung không bao giờ đổi, ảnh được phục vụ kèm
`Cache-Control: public, max-age=31536000, immutable`.

## Ảnh không bị dọn

Xoá bài hay xoá đoạn Markdown chứa ảnh **không** xoá object trong R2. Muốn dọn
thì phải tự làm:

```bash
npx wrangler r2 object delete blog-media/2026/09/ten-anh-a1b2c3d4e5.png --remote
```

## Ảnh tĩnh của giao diện

`public/` vẫn dùng bình thường cho logo, ảnh mặc định Open Graph, ảnh minh hoạ
trang dự án — những thứ đi kèm code và nên nằm trong git. Chỉ ảnh **trong bài
blog** mới đi qua R2.

## Khi có sự cố

| Thông báo | Ý nghĩa |
|---|---|
| "Chưa cấu hình MEDIA_BASE_URL cho bucket ảnh." | Thiếu secret. Xem [04 — Secret](./04-trien-khai-cloudflare-workers.md#secret). |
| "Không nhận kiểu file …" | Ngoài danh sách cho phép. Đổi sang png/webp. |
| "File 7.4 MB, tối đa 5 MB." | Nén ảnh lại trước khi upload. |
| Upload xong, ảnh hiện ô vỡ | Tên miền ảnh chưa trỏ đúng bucket. Thử mở thẳng URL ảnh trong tab mới — 404 nghĩa là lỗi ở tên miền/bucket, không phải ở bài. |
