# Chèn ảnh trong bài viết

## 1) Đặt ảnh đúng thư mục

Tạo thư mục theo slug bài viết để dễ quản lý:

```text
public/images/posts/<slug-bai-viet>/
```

Ví dụ:

```text
public/images/posts/2026-03-10-ml-co-ban-05-linear-regression/
```

## 2) Chèn ảnh trong Markdown

```md
![Mô tả ảnh](/images/posts/2026-03-10-ml-co-ban-05-linear-regression/so-do.png)
```

## 3) Chú thích ảnh (tùy chọn)

```md
![Đường fit tuyến tính](/images/posts/2026-03-10-ml-co-ban-05-linear-regression/fit.png)

*Hình 1: So sánh dữ liệu thật và đường dự đoán.*
```

## 4) Lưu ý quan trọng

- Dùng đường dẫn bắt đầu bằng `/images/...`.
- Tránh dấu cách trong tên file ảnh, ưu tiên `kebab-case`.
- Định dạng khuyên dùng: `webp`, `png`, `jpg`.
- Vì project đang `output: "export"`, ảnh trong `public/` sẽ được xuất thẳng ra static site.
